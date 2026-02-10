"""Stateful escape detector — combines PiP, boundary distance, motion, scatter, and breach duration."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from engine.detection.motion import compute_motion_vector
from engine.detection.scatter import compute_scatter
from engine.geo.boundary import distance_to_nearest_boundary
from engine.models.alert import Alert, AlertLevel, AlertType
from engine.models.geofence import Geofence
from engine.models.position import TrackPoint


class DetectionConfig(BaseModel, frozen=True):
    """Thresholds for the escape detector."""

    warning_buffer_m: float = Field(default=20.0, description="Distance inside fence to start warning")
    breach_confirm_s: float = Field(default=10.0, description="Seconds outside fence before confirming escape")
    scatter_threshold_m: float = Field(default=50.0, description="Scatter radius above which readings are unreliable")
    max_history: int = Field(default=20, description="Max recent points to keep per dog")


class DogState:
    """Mutable per-dog tracking state (not serialized)."""

    def __init__(self) -> None:
        self.recent_points: list[TrackPoint] = []
        self.breach_start: datetime | None = None
        self.last_alert_type: AlertType | None = None


class EscapeDetector:
    """Stateful per-dog escape detector.

    Call evaluate() with each new TrackPoint for a given dog + geofence.
    Returns an Alert if a state transition warrants one, or None.
    """

    def __init__(self, config: DetectionConfig | None = None) -> None:
        self.config = config or DetectionConfig()
        self._states: dict[str, DogState] = {}

    def _get_state(self, dog_id: str) -> DogState:
        if dog_id not in self._states:
            self._states[dog_id] = DogState()
        return self._states[dog_id]

    def evaluate(self, point: TrackPoint, geofence: Geofence) -> Alert | None:
        """Evaluate a new position against a geofence. Returns an Alert on state transition."""
        dog_id = point.dog_id or point.device_id
        state = self._get_state(dog_id)

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

        # Compute motion for context (not directly used for alerting yet, but stored)
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

        # Outside the fence
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

        # Already outside — check if breach duration exceeds confirmation threshold
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
