"""Tests for engine data models."""

from datetime import datetime

from engine.models.alert import Alert, AlertLevel, AlertType
from engine.models.dog import CollarDevice, DogProfile
from engine.models.geofence import BoundaryProximity, Coordinate, Geofence
from engine.models.position import GpsReading, TrackPoint


def test_gps_reading_frozen():
    r = GpsReading(lat=35.0, lon=-80.0, timestamp=datetime(2025, 1, 1))
    assert r.lat == 35.0
    assert r.alt is None


def test_track_point():
    r = GpsReading(lat=35.0, lon=-80.0, timestamp=datetime(2025, 1, 1))
    tp = TrackPoint(device_id="!aabbccdd", reading=r, received_at=datetime(2025, 1, 1))
    assert tp.dog_id is None
    assert tp.rssi is None


def test_coordinate():
    c = Coordinate(lat=35.0, lon=-80.0)
    assert c.lat == 35.0


def test_geofence_defaults():
    g = Geofence(
        id="g1",
        name="Yard",
        vertices=[Coordinate(lat=0, lon=0), Coordinate(lat=0, lon=1), Coordinate(lat=1, lon=0)],
    )
    assert g.enabled is True
    assert g.buffer_meters == 0.0


def test_boundary_proximity():
    bp = BoundaryProximity(inside=True, distance_to_boundary_meters=15.0, nearest_segment_index=0, bearing=90.0)
    assert bp.inside is True


def test_collar_device():
    d = CollarDevice(device_id="!aabbccdd")
    assert d.long_name == ""


def test_dog_profile():
    dp = DogProfile(id="d1", name="Rex")
    assert dp.device_id is None
    assert dp.geofence_ids == []


def test_alert_enums():
    assert AlertLevel.escape.value == "escape"
    assert AlertType.geofence_breach.value == "geofence_breach"


def test_alert():
    a = Alert(
        id="a1",
        dog_id="d1",
        device_id="!aabbccdd",
        type=AlertType.geofence_breach,
        level=AlertLevel.breach,
    )
    assert a.acknowledged is False


def test_noise_profile():
    from datetime import datetime

    from engine.models.noise import NoiseProfile

    np = NoiseProfile(
        device_id="!aabbccdd",
        noise_radius_m=3.5,
        sample_count=25,
        last_updated=datetime(2025, 6, 1),
        confidence=0.5,
    )
    assert np.device_id == "!aabbccdd"
    assert np.noise_radius_m == 3.5
    assert np.sample_count == 25
    assert np.confidence == 0.5


def test_noise_profile_frozen():
    from datetime import datetime

    import pytest

    from engine.models.noise import NoiseProfile

    np = NoiseProfile(
        device_id="!aabbccdd",
        noise_radius_m=3.5,
        sample_count=25,
        last_updated=datetime(2025, 6, 1),
    )
    with pytest.raises(Exception):
        np.noise_radius_m = 5.0  # type: ignore[misc]


def test_noise_profile_default_confidence():
    from datetime import datetime

    from engine.models.noise import NoiseProfile

    np = NoiseProfile(
        device_id="!aabbccdd",
        noise_radius_m=3.5,
        sample_count=25,
        last_updated=datetime(2025, 6, 1),
    )
    assert np.confidence == 0.0
