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


def _make_point(lat: float, lon: float, seconds_offset: float = 0, dog_id: str = "rex") -> TrackPoint:
    ts = BASE_TIME + timedelta(seconds=seconds_offset)
    return TrackPoint(
        device_id="!aabbccdd",
        dog_id=dog_id,
        reading=GpsReading(lat=lat, lon=lon, timestamp=ts),
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
