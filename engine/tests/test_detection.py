"""Tests for detection algorithms."""

from datetime import datetime, timedelta

from engine.detection.escape import DetectionConfig, EscapeDetector
from engine.detection.motion import compute_motion_vector
from engine.detection.sampling import SamplingConfig, compute_desired_interval
from engine.detection.scatter import compute_scatter
from engine.models.alert import AlertLevel, AlertType
from engine.models.geofence import Coordinate, Geofence
from engine.models.position import GpsReading, TrackPoint

# Square geofence
FENCE = Geofence(
    id="yard",
    name="Yard",
    vertices=[
        Coordinate(lat=35.000, lon=-80.001),
        Coordinate(lat=35.000, lon=-79.999),
        Coordinate(lat=35.002, lon=-79.999),
        Coordinate(lat=35.002, lon=-80.001),
    ],
)

BASE_TIME = datetime(2025, 6, 1, 12, 0, 0)


def _make_point(
    lat: float,
    lon: float,
    seconds_offset: float = 0,
    dog_id: str = "rex",
    *,
    hdop: float | None = None,
    sats: int | None = None,
) -> TrackPoint:
    ts = BASE_TIME + timedelta(seconds=seconds_offset)
    return TrackPoint(
        device_id="!aabbccdd",
        dog_id=dog_id,
        reading=GpsReading(lat=lat, lon=lon, timestamp=ts, hdop=hdop, sats=sats),
        received_at=ts,
    )


class TestMotion:
    def test_no_points(self):
        assert compute_motion_vector([]) is None

    def test_single_point(self):
        assert compute_motion_vector([_make_point(35.001, -80.0)]) is None

    def test_stationary(self):
        p1 = _make_point(35.001, -80.0, 0)
        p2 = _make_point(35.001, -80.0, 10)
        mv = compute_motion_vector([p1, p2])
        assert mv is not None
        assert mv.speed_mps < 0.01

    def test_moving_north(self):
        p1 = _make_point(35.000, -80.0, 0)
        p2 = _make_point(35.001, -80.0, 10)
        mv = compute_motion_vector([p1, p2])
        assert mv is not None
        assert mv.speed_mps > 5  # ~111m in 10s = ~11 m/s
        assert 350 < mv.heading or mv.heading < 10  # roughly north


class TestScatter:
    def test_no_points(self):
        assert compute_scatter([]) is None

    def test_tight_cluster(self):
        points = [_make_point(35.001, -80.0, i) for i in range(5)]
        s = compute_scatter(points)
        assert s is not None
        assert s.radius_meters < 1.0

    def test_spread_cluster(self):
        points = [
            _make_point(35.000, -80.000, 0),
            _make_point(35.001, -80.000, 1),
            _make_point(35.000, -80.001, 2),
            _make_point(35.001, -80.001, 3),
        ]
        s = compute_scatter(points)
        assert s is not None
        assert s.radius_meters > 50


class TestSampling:
    def test_near_boundary(self):
        cfg = SamplingConfig()
        assert compute_desired_interval(5.0, cfg) == cfg.min_interval_s

    def test_far_from_boundary(self):
        cfg = SamplingConfig()
        assert compute_desired_interval(300.0, cfg) == cfg.max_interval_s

    def test_mid_range(self):
        cfg = SamplingConfig(min_interval_s=10, max_interval_s=60, near_boundary_m=10, far_boundary_m=110)
        interval = compute_desired_interval(60.0, cfg)
        assert 10 < interval < 60


class TestEscapeDetector:
    def test_inside_no_alert(self):
        det = EscapeDetector()
        # Well inside the fence
        alert = det.evaluate(_make_point(35.001, -80.0, 0), FENCE)
        assert alert is None

    def test_approach_warning(self):
        det = EscapeDetector(DetectionConfig(warning_buffer_m=20.0))
        # Just inside the south edge (~11m from boundary)
        alert = det.evaluate(_make_point(35.0001, -80.0, 0), FENCE)
        assert alert is not None
        assert alert.type == AlertType.boundary_approach
        assert alert.level == AlertLevel.warning

    def test_breach_alert(self):
        det = EscapeDetector()
        # Outside the fence
        alert = det.evaluate(_make_point(34.999, -80.0, 0), FENCE)
        assert alert is not None
        assert alert.type == AlertType.geofence_breach
        assert alert.level == AlertLevel.breach

    def test_escape_after_duration(self):
        det = EscapeDetector(DetectionConfig(breach_confirm_s=10.0))
        # First outside — breach
        alert1 = det.evaluate(_make_point(34.999, -80.0, 0), FENCE)
        assert alert1 is not None
        assert alert1.type == AlertType.geofence_breach

        # Still outside 5s later — no new alert
        alert2 = det.evaluate(_make_point(34.999, -80.0, 5), FENCE)
        assert alert2 is None

        # Still outside 15s later — escape confirmed
        alert3 = det.evaluate(_make_point(34.999, -80.0, 15), FENCE)
        assert alert3 is not None
        assert alert3.type == AlertType.escape_detected
        assert alert3.level == AlertLevel.escape

    def test_return_after_breach(self):
        det = EscapeDetector(DetectionConfig(scatter_threshold_m=500.0))
        # Outside — breach
        det.evaluate(_make_point(34.999, -80.0, 0), FENCE)
        # Back inside — return
        alert = det.evaluate(_make_point(35.001, -80.0, 5), FENCE)
        assert alert is not None
        assert alert.type == AlertType.return_detected
        assert alert.level == AlertLevel.info

    def test_full_sequence(self):
        """Dog starts inside, approaches boundary, exits, stays out, returns."""
        det = EscapeDetector(DetectionConfig(warning_buffer_m=20.0, breach_confirm_s=10.0, scatter_threshold_m=500.0))

        # 1. Well inside — no alert
        a = det.evaluate(_make_point(35.001, -80.0, 0), FENCE)
        assert a is None

        # 2. Approaching boundary — warning
        a = det.evaluate(_make_point(35.0001, -80.0, 5), FENCE)
        assert a is not None and a.type == AlertType.boundary_approach

        # 3. Outside — breach
        a = det.evaluate(_make_point(34.999, -80.0, 10), FENCE)
        assert a is not None and a.type == AlertType.geofence_breach

        # 4. Still outside 5s — no new alert
        a = det.evaluate(_make_point(34.999, -80.0, 15), FENCE)
        assert a is None

        # 5. Still outside 15s — escape
        a = det.evaluate(_make_point(34.998, -80.0, 25), FENCE)
        assert a is not None and a.type == AlertType.escape_detected

        # 6. Returns inside — return detected
        a = det.evaluate(_make_point(35.001, -80.0, 30), FENCE)
        assert a is not None and a.type == AlertType.return_detected


class TestNoiseAwareDetection:
    """Tests for the noise-aware escape detection path."""

    def _noise_config(self, **kwargs) -> DetectionConfig:
        defaults = {
            "noise_aware": True,
            "default_noise_radius_m": 8.0,
            "scatter_threshold_m": 500.0,
            "breach_confirm_s": 10.0,
            "warning_buffer_m": 20.0,
        }
        defaults.update(kwargs)
        return DetectionConfig(**defaults)

    def test_legacy_behavior_when_disabled(self):
        """When noise_aware=False, behavior is identical to legacy."""
        det = EscapeDetector(DetectionConfig(noise_aware=False))
        alert = det.evaluate(_make_point(34.999, -80.0, 0), FENCE)
        assert alert is not None
        assert alert.type == AlertType.geofence_breach

    def test_far_breach_always_alerts(self):
        """Outside > 2× noise radius → always breach, regardless of coherence."""
        cfg = self._noise_config(default_noise_radius_m=8.0, min_breach_significance=2.0)
        det = EscapeDetector(cfg)

        # Feed some inside points first for history
        for i in range(4):
            det.evaluate(_make_point(35.001, -80.0, i * 15), FENCE)

        # Now go far outside (34.999 is ~111m south of fence edge at 35.000)
        alert = det.evaluate(_make_point(34.999, -80.0, 60), FENCE)
        assert alert is not None
        assert alert.type == AlertType.geofence_breach

    def test_small_breach_no_coherence_suppressed(self):
        """Just barely outside + no coherent motion → suppressed as GPS noise."""
        cfg = self._noise_config(default_noise_radius_m=8.0, min_breach_significance=2.0)
        det = EscapeDetector(cfg)

        # Simulate GPS bouncing near the south boundary (lat=35.000):
        # zigzag pattern — inside, barely outside, inside, barely outside
        # This creates low linearity (random walk, not directed motion)
        det.evaluate(_make_point(35.00005, -80.0, 0), FENCE)   # ~5m inside
        det.evaluate(_make_point(34.99997, -80.0, 15), FENCE)  # ~3m outside
        det.evaluate(_make_point(35.00003, -80.0, 30), FENCE)  # ~3m inside
        det.evaluate(_make_point(34.99998, -80.0, 45), FENCE)  # ~2m outside
        det.evaluate(_make_point(35.00002, -80.0, 60), FENCE)  # ~2m inside

        # Another bounce outside — small distance, no coherent outward trend
        alert = det.evaluate(_make_point(34.99997, -80.0, 75), FENCE)
        assert alert is None  # Suppressed — zigzag = no coherent outward motion

    def test_real_escape_with_coherent_motion(self):
        """Coherent outward motion just outside fence → breach alert."""
        cfg = self._noise_config(
            default_noise_radius_m=8.0,
            min_breach_significance=100.0,  # Set very high so distance alone won't trigger
            min_escape_coherence=0.3,
        )
        det = EscapeDetector(cfg)

        # Build trajectory heading south (outward from fence)
        # Start inside, then progressively move south through and past the fence
        det.evaluate(_make_point(35.0005, -80.0, 0), FENCE)
        det.evaluate(_make_point(35.0003, -80.0, 15), FENCE)
        det.evaluate(_make_point(35.0001, -80.0, 30), FENCE)

        # Now outside and continuing south — coherent outward motion
        alert = det.evaluate(_make_point(34.9998, -80.0, 45), FENCE)
        assert alert is not None
        assert alert.type == AlertType.geofence_breach

    def test_escape_confirmed_noise_aware(self):
        """Full escape sequence with noise-aware mode."""
        cfg = self._noise_config(breach_confirm_s=10.0)
        det = EscapeDetector(cfg)

        # Far outside — breach (distance > 2× noise)
        alert1 = det.evaluate(_make_point(34.999, -80.0, 0), FENCE)
        assert alert1 is not None
        assert alert1.type == AlertType.geofence_breach

        # Still far outside 5s later — no escalation yet
        alert2 = det.evaluate(_make_point(34.999, -80.0, 5), FENCE)
        assert alert2 is None

        # Still far outside 15s later — escape confirmed
        alert3 = det.evaluate(_make_point(34.998, -80.0, 15), FENCE)
        assert alert3 is not None
        assert alert3.type == AlertType.escape_detected

    def test_return_detected_noise_aware(self):
        """Return detection works in noise-aware mode."""
        cfg = self._noise_config()
        det = EscapeDetector(cfg)

        # Far outside — breach
        det.evaluate(_make_point(34.999, -80.0, 0), FENCE)

        # Back inside — return (enough time gap so speed < 30 m/s)
        alert = det.evaluate(_make_point(35.001, -80.0, 15), FENCE)
        assert alert is not None
        assert alert.type == AlertType.return_detected

    def test_noise_profile_injection(self):
        """Injected noise profile is used for significance check."""
        from engine.models.noise import NoiseProfile

        cfg = self._noise_config(default_noise_radius_m=1.0, min_breach_significance=2.0)
        det = EscapeDetector(cfg)

        # Inject a wide noise profile (50m)
        profile = NoiseProfile(
            device_id="!aabbccdd",
            noise_radius_m=50.0,
            sample_count=100,
            last_updated=BASE_TIME,
            confidence=1.0,
        )
        det.set_noise_profile("rex", profile)

        # Build zigzag history near boundary so coherence is low
        det.evaluate(_make_point(35.00005, -80.0, 0), FENCE)
        det.evaluate(_make_point(34.99997, -80.0, 15), FENCE)
        det.evaluate(_make_point(35.00003, -80.0, 30), FENCE)
        det.evaluate(_make_point(34.99998, -80.0, 45), FENCE)

        # ~11m outside — with 50m noise radius, significance = 11/50 < 2 → suppressed
        # And zigzag history means coherence is low too
        alert = det.evaluate(_make_point(34.9999, -80.0, 60), FENCE)
        assert alert is None  # Suppressed: low significance + no coherent motion

    def test_noise_profile_extraction(self):
        """get_noise_profile returns the current profile."""
        cfg = self._noise_config()
        det = EscapeDetector(cfg)

        assert det.get_noise_profile("rex") is None

        from engine.models.noise import NoiseProfile

        profile = NoiseProfile(
            device_id="!aabbccdd",
            noise_radius_m=5.0,
            sample_count=50,
            last_updated=BASE_TIME,
            confidence=1.0,
        )
        det.set_noise_profile("rex", profile)
        assert det.get_noise_profile("rex") is profile

    def test_auto_learn_noise_from_stationary(self):
        """Stationary points auto-update the noise profile."""
        cfg = self._noise_config(
            noise_min_stationary_points=4,
            noise_stationarity_threshold_m=5.0,
        )
        det = EscapeDetector(cfg)

        # Feed stationary points (all at same location, well inside fence)
        for i in range(5):
            det.evaluate(_make_point(35.001, -80.0, i * 15), FENCE)

        # Should have auto-learned a noise profile
        profile = det.get_noise_profile("rex")
        assert profile is not None
        assert profile.noise_radius_m < 1.0  # Nearly zero scatter
        assert profile.sample_count >= 4

    def test_inside_behavior_unchanged_noise_aware(self):
        """Inside the fence, noise-aware mode doesn't change behavior."""
        cfg = self._noise_config()
        det = EscapeDetector(cfg)

        # Well inside — no alert
        alert = det.evaluate(_make_point(35.001, -80.0, 0), FENCE)
        assert alert is None

    def test_approach_warning_noise_aware(self):
        """Approach warnings still fire in noise-aware mode."""
        cfg = self._noise_config(warning_buffer_m=20.0)
        det = EscapeDetector(cfg)

        # Just inside the south edge
        alert = det.evaluate(_make_point(35.0001, -80.0, 0), FENCE)
        assert alert is not None
        assert alert.type == AlertType.boundary_approach

    def test_anomalous_jump_rejected(self):
        """GPS teleport is silently dropped — not added to history."""
        cfg = self._noise_config(max_dog_speed_mps=30.0)
        det = EscapeDetector(cfg)

        # Normal point inside fence
        det.evaluate(_make_point(35.001, -80.0, 0), FENCE)

        # GPS teleport: ~11km in 30s = ~370 m/s — way beyond 30 m/s
        alert = det.evaluate(_make_point(35.100, -80.0, 30), FENCE)
        assert alert is None  # Rejected entirely

        # Next normal point should still work (teleport wasn't added to history)
        alert = det.evaluate(_make_point(35.001, -80.0, 45), FENCE)
        assert alert is None  # Still inside, no alert

    def test_anomalous_jump_doesnt_trigger_breach(self):
        """A GPS teleport outside the fence doesn't cause a breach alert."""
        cfg = self._noise_config(max_dog_speed_mps=30.0)
        det = EscapeDetector(cfg)

        # Build up history inside
        for i in range(3):
            det.evaluate(_make_point(35.001, -80.0, i * 15), FENCE)

        # GPS teleport to far outside (34.9 is ~11km south)
        alert = det.evaluate(_make_point(34.900, -80.0, 60), FENCE)
        assert alert is None  # Rejected — impossibly fast

    def test_poor_hdop_suppresses_marginal_breach(self):
        """High HDOP inflates effective noise radius, suppressing marginal breaches."""
        cfg = self._noise_config(
            default_noise_radius_m=8.0,
            min_breach_significance=2.0,
            hdop_baseline=1.5,
        )
        det = EscapeDetector(cfg)

        # Build zigzag history so coherence is low
        det.evaluate(_make_point(35.00005, -80.0, 0, hdop=1.0), FENCE)
        det.evaluate(_make_point(34.99997, -80.0, 15, hdop=1.0), FENCE)
        det.evaluate(_make_point(35.00003, -80.0, 30, hdop=1.0), FENCE)
        det.evaluate(_make_point(34.99998, -80.0, 45, hdop=1.0), FENCE)

        # ~20m outside with bad HDOP=6.0 → effective noise = 8 * (6/1.5) = 32m
        # significance = 20/32 ≈ 0.6 < 2.0 → suppressed
        alert = det.evaluate(_make_point(34.99982, -80.0, 60, hdop=6.0), FENCE)
        assert alert is None  # Suppressed — poor fix quality inflated uncertainty

    def test_poor_hdop_doesnt_suppress_large_breach(self):
        """Even with bad HDOP, a very far breach still alerts."""
        cfg = self._noise_config(
            default_noise_radius_m=8.0,
            min_breach_significance=2.0,
            hdop_baseline=1.5,
            max_uncertainty_factor=5.0,
        )
        det = EscapeDetector(cfg)

        # Even with max uncertainty (5×), effective noise = 8 * 5 = 40m
        # 111m outside → significance = 111/40 ≈ 2.8 > 2.0
        alert = det.evaluate(_make_point(34.999, -80.0, 0, hdop=30.0), FENCE)
        assert alert is not None
        assert alert.type == AlertType.geofence_breach

    def test_low_sats_suppresses_marginal_breach(self):
        """Few satellites inflate uncertainty, suppressing marginal breaches."""
        cfg = self._noise_config(
            default_noise_radius_m=8.0,
            min_breach_significance=2.0,
            min_sats=6,
        )
        det = EscapeDetector(cfg)

        # Build zigzag history
        det.evaluate(_make_point(35.00005, -80.0, 0, sats=10), FENCE)
        det.evaluate(_make_point(34.99997, -80.0, 15, sats=10), FENCE)
        det.evaluate(_make_point(35.00003, -80.0, 30, sats=10), FENCE)
        det.evaluate(_make_point(34.99998, -80.0, 45, sats=10), FENCE)

        # ~20m outside with only 3 sats → effective noise = 8 * (6/3) = 16m
        # significance = 20/16 = 1.25 < 2.0 → suppressed
        alert = det.evaluate(_make_point(34.99982, -80.0, 60, sats=3), FENCE)
        assert alert is None  # Suppressed — low sat count inflated uncertainty
