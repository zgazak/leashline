"""Stateful escape detector — combines PiP, boundary distance, motion, scatter, and breach duration."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from engine.detection.coherence import compute_motion_coherence, is_motion_significant
from engine.detection.motion import compute_motion_vector
from engine.detection.noise import (
    compute_noise_from_stationary,
    detect_stationary,
    fix_uncertainty_factor,
    is_anomalous_jump,
    update_noise_profile,
)
from engine.detection.scatter import compute_scatter
from engine.geo.boundary import distance_to_nearest_boundary
from engine.models.alert import Alert, AlertLevel, AlertType
from engine.models.geofence import Geofence
from engine.models.noise import NoiseProfile
from engine.models.position import TrackPoint


class DetectionConfig(BaseModel, frozen=True):
    """Thresholds for the escape detector."""

    warning_buffer_m: float = Field(default=20.0, description="Distance inside fence to start warning")
    breach_confirm_s: float = Field(default=10.0, description="Seconds outside fence before confirming escape")
    scatter_threshold_m: float = Field(default=50.0, description="Scatter radius above which readings are unreliable")
    max_history: int = Field(default=20, description="Max recent points to keep per dog")

    # Noise-aware detection (opt-in)
    noise_aware: bool = Field(default=False, description="Enable noise-aware breach suppression")
    default_noise_radius_m: float = Field(default=8.0, description="Fallback noise radius when no profile learned")
    min_breach_significance: float = Field(default=2.0, description="Breach distance must exceed N× noise radius")
    min_escape_coherence: float = Field(default=0.4, description="Linearity threshold for escape motion")
    noise_stationarity_threshold_m: float = Field(default=30.0, description="Max displacement for stationary detection")
    noise_min_stationary_points: int = Field(default=4, description="Min points for stationary window")

    # Per-fix quality scaling
    hdop_baseline: float = Field(default=1.5, description="HDOP at or below this is considered good")
    min_sats: int = Field(default=6, description="Below this sat count, inflate uncertainty")
    max_uncertainty_factor: float = Field(default=5.0, description="Cap on per-fix uncertainty multiplier")
    max_dog_speed_mps: float = Field(default=30.0, description="Reject fixes implying speed above this (m/s)")


class DogState:
    """Mutable per-dog tracking state (not serialized)."""

    def __init__(self) -> None:
        self.recent_points: list[TrackPoint] = []
        self.breach_start: datetime | None = None
        self.last_alert_type: AlertType | None = None
        self.noise_profile: NoiseProfile | None = None
        self.boundary_distances: list[float] = []


class EscapeDetector:
    """Stateful per-dog escape detector.

    Call evaluate() with each new TrackPoint for a given dog + geofence.
    Returns an Alert if a state transition warrants one, or None.

    When config.noise_aware is True, the detector auto-learns GPS noise
    from stationary periods and uses coherence analysis to suppress false
    breach alerts caused by GPS jitter near fence boundaries.
    """

    def __init__(self, config: DetectionConfig | None = None) -> None:
        self.config = config or DetectionConfig()
        self._states: dict[str, DogState] = {}

    def _get_state(self, dog_id: str) -> DogState:
        if dog_id not in self._states:
            self._states[dog_id] = DogState()
        return self._states[dog_id]

    def get_noise_profile(self, dog_id: str) -> NoiseProfile | None:
        """Return the current noise profile for a dog (for app-layer persistence)."""
        state = self._states.get(dog_id)
        return state.noise_profile if state else None

    def set_noise_profile(self, dog_id: str, profile: NoiseProfile) -> None:
        """Restore a previously persisted noise profile (e.g. on startup)."""
        state = self._get_state(dog_id)
        state.noise_profile = profile

    def evaluate(self, point: TrackPoint, geofence: Geofence) -> Alert | None:
        """Evaluate a new position against a geofence. Returns an Alert on state transition."""
        dog_id = point.dog_id or point.device_id
        state = self._get_state(dog_id)

        # Reject anomalous jumps (GPS teleports) — don't even add to history
        if self.config.noise_aware and state.recent_points:
            if is_anomalous_jump(state.recent_points[-1], point, self.config.max_dog_speed_mps):
                return None

        # Update history
        state.recent_points.append(point)
        if len(state.recent_points) > self.config.max_history:
            state.recent_points = state.recent_points[-self.config.max_history :]

        # Check scatter — if GPS is too noisy, skip detection
        scatter = compute_scatter(state.recent_points)
        if scatter and scatter.radius_meters > self.config.scatter_threshold_m:
            return None

        # Boundary proximity check
        proximity = distance_to_nearest_boundary(point.reading.lat, point.reading.lon, geofence.vertices)

        # Track boundary distances for coherence analysis
        if self.config.noise_aware:
            state.boundary_distances.append(proximity.distance_to_boundary_meters)
            if len(state.boundary_distances) > self.config.max_history:
                state.boundary_distances = state.boundary_distances[-self.config.max_history :]

            # Auto-update noise profile from stationary windows
            self._try_update_noise_profile(state, point.device_id, point.reading.timestamp)

        # Compute motion for context
        compute_motion_vector(state.recent_points)

        now = point.reading.timestamp

        if proximity.inside:
            if state.breach_start is not None:
                # Dog returned inside the fence
                state.breach_start = None
                if state.last_alert_type in (AlertType.geofence_breach, AlertType.escape_detected):
                    state.last_alert_type = AlertType.return_detected
                    return self._make_alert(
                        dog_id=dog_id,
                        device_id=point.device_id,
                        alert_type=AlertType.return_detected,
                        level=AlertLevel.info,
                        geofence=geofence,
                        point=point,
                        message=f"{dog_id} returned inside {geofence.name}",
                    )

            # Check if approaching boundary (warning zone)
            if 0 < proximity.distance_to_boundary_meters <= self.config.warning_buffer_m:
                if state.last_alert_type != AlertType.boundary_approach:
                    state.last_alert_type = AlertType.boundary_approach
                    return self._make_alert(
                        dog_id=dog_id,
                        device_id=point.device_id,
                        alert_type=AlertType.boundary_approach,
                        level=AlertLevel.warning,
                        geofence=geofence,
                        point=point,
                        message=f"{dog_id} approaching boundary of {geofence.name} ({proximity.distance_to_boundary_meters:.0f}m)",
                    )

            # Well inside — reset approach alerts
            if proximity.distance_to_boundary_meters > self.config.warning_buffer_m:
                state.last_alert_type = None

            return None

        # Outside the fence — use noise-aware or legacy path
        if self.config.noise_aware:
            return self._evaluate_noise_aware(dog_id, state, point, geofence, proximity, now)

        return self._evaluate_legacy(dog_id, state, point, geofence, now)

    def _evaluate_legacy(
        self,
        dog_id: str,
        state: DogState,
        point: TrackPoint,
        geofence: Geofence,
        now: datetime,
    ) -> Alert | None:
        """Original breach detection — binary PiP + timer."""
        if state.breach_start is None:
            state.breach_start = now
            state.last_alert_type = AlertType.geofence_breach
            return self._make_alert(
                dog_id=dog_id,
                device_id=point.device_id,
                alert_type=AlertType.geofence_breach,
                level=AlertLevel.breach,
                geofence=geofence,
                point=point,
                message=f"{dog_id} breached {geofence.name}",
            )

        breach_duration = (now - state.breach_start).total_seconds()
        if breach_duration >= self.config.breach_confirm_s and state.last_alert_type != AlertType.escape_detected:
            state.last_alert_type = AlertType.escape_detected
            return self._make_alert(
                dog_id=dog_id,
                device_id=point.device_id,
                alert_type=AlertType.escape_detected,
                level=AlertLevel.escape,
                geofence=geofence,
                point=point,
                message=f"{dog_id} ESCAPED from {geofence.name} (outside for {breach_duration:.0f}s)",
            )

        return None

    def _evaluate_noise_aware(
        self,
        dog_id: str,
        state: DogState,
        point: TrackPoint,
        geofence: Geofence,
        proximity,
        now: datetime,
    ) -> Alert | None:
        """Noise-aware breach detection — suppresses GPS noise near boundaries."""
        base_noise_radius = (
            state.noise_profile.noise_radius_m
            if state.noise_profile and state.noise_profile.confidence > 0
            else self.config.default_noise_radius_m
        )

        # Scale noise radius by per-fix quality (poor HDOP/sats → wider uncertainty)
        uncertainty = fix_uncertainty_factor(
            point,
            hdop_baseline=self.config.hdop_baseline,
            min_sats=self.config.min_sats,
            max_factor=self.config.max_uncertainty_factor,
        )
        noise_radius = base_noise_radius * uncertainty

        # Distance outside fence (proximity.distance_to_boundary_meters is negative when outside)
        distance_outside = abs(proximity.distance_to_boundary_meters)
        breach_significance = distance_outside / noise_radius if noise_radius > 0 else float("inf")

        # Check if distance alone is convincing (> 2× noise radius)
        if breach_significance >= self.config.min_breach_significance:
            # Far enough outside that GPS noise can't explain it
            if state.breach_start is None:
                state.breach_start = now
                state.last_alert_type = AlertType.geofence_breach
                return self._make_alert(
                    dog_id=dog_id,
                    device_id=point.device_id,
                    alert_type=AlertType.geofence_breach,
                    level=AlertLevel.breach,
                    geofence=geofence,
                    point=point,
                    message=f"{dog_id} breached {geofence.name}",
                )

            breach_duration = (now - state.breach_start).total_seconds()
            if breach_duration >= self.config.breach_confirm_s and state.last_alert_type != AlertType.escape_detected:
                state.last_alert_type = AlertType.escape_detected
                return self._make_alert(
                    dog_id=dog_id,
                    device_id=point.device_id,
                    alert_type=AlertType.escape_detected,
                    level=AlertLevel.escape,
                    geofence=geofence,
                    point=point,
                    message=f"{dog_id} ESCAPED from {geofence.name} (outside for {breach_duration:.0f}s)",
                )

            return None

        # Distance is small relative to noise — check motion coherence
        coherence = compute_motion_coherence(
            state.recent_points,
            noise_radius_m=noise_radius,
            boundary_distances=state.boundary_distances,
        )

        if coherence and is_motion_significant(coherence, min_linearity=self.config.min_escape_coherence):
            # Coherent motion — check if trending outward (boundary_trend < 0 means moving away from fence)
            if coherence.boundary_trend < 0:
                # Real escape: coherent outward motion
                if state.breach_start is None:
                    state.breach_start = now
                    state.last_alert_type = AlertType.geofence_breach
                    return self._make_alert(
                        dog_id=dog_id,
                        device_id=point.device_id,
                        alert_type=AlertType.geofence_breach,
                        level=AlertLevel.breach,
                        geofence=geofence,
                        point=point,
                        message=f"{dog_id} breached {geofence.name}",
                    )

                breach_duration = (now - state.breach_start).total_seconds()
                if breach_duration >= self.config.breach_confirm_s and state.last_alert_type != AlertType.escape_detected:
                    state.last_alert_type = AlertType.escape_detected
                    return self._make_alert(
                        dog_id=dog_id,
                        device_id=point.device_id,
                        alert_type=AlertType.escape_detected,
                        level=AlertLevel.escape,
                        geofence=geofence,
                        point=point,
                        message=f"{dog_id} ESCAPED from {geofence.name} (outside for {breach_duration:.0f}s)",
                    )

                return None

        # Suppress: small distance + no coherent outward motion = likely GPS noise
        return None

    def _try_update_noise_profile(
        self,
        state: DogState,
        device_id: str,
        now: datetime,
    ) -> None:
        """Auto-learn noise from the tail of recent_points if they look stationary."""
        cfg = self.config
        points = state.recent_points

        if len(points) < cfg.noise_min_stationary_points:
            return

        # Check the last N points for stationarity
        tail = points[-cfg.noise_min_stationary_points :]
        if not detect_stationary(tail, max_displacement_m=cfg.noise_stationarity_threshold_m, min_points=cfg.noise_min_stationary_points):
            return

        noise_radius = compute_noise_from_stationary(tail)
        state.noise_profile = update_noise_profile(
            existing=state.noise_profile,
            new_noise_radius_m=noise_radius,
            new_sample_count=len(tail),
            device_id=device_id,
            timestamp=now,
        )

    @staticmethod
    def _make_alert(
        dog_id: str,
        device_id: str,
        alert_type: AlertType,
        level: AlertLevel,
        geofence: Geofence,
        point: TrackPoint,
        message: str,
    ) -> Alert:
        return Alert(
            id=uuid.uuid4().hex,
            dog_id=dog_id,
            device_id=device_id,
            type=alert_type,
            level=level,
            geofence_id=geofence.id,
            message=message,
            lat=point.reading.lat,
            lon=point.reading.lon,
        )
