"""Tests for GPS noise profiling."""

from datetime import datetime, timedelta

from engine.detection.noise import (
    compute_noise_from_stationary,
    detect_stationary,
    update_noise_profile,
)
from engine.models.noise import NoiseProfile
from engine.models.position import GpsReading, TrackPoint

BASE_TIME = datetime(2025, 6, 1, 12, 0, 0)


def _make_point(lat: float, lon: float, seconds_offset: float = 0) -> TrackPoint:
    ts = BASE_TIME + timedelta(seconds=seconds_offset)
    return TrackPoint(
        device_id="!aabbccdd",
        dog_id="rex",
        reading=GpsReading(lat=lat, lon=lon, timestamp=ts),
        received_at=ts,
    )


class TestDetectStationary:
    def test_too_few_points(self):
        points = [_make_point(35.0, -80.0, i) for i in range(3)]
        assert detect_stationary(points) is False

    def test_stationary_tight_cluster(self):
        # 5 points within ~1m of each other
        points = [
            _make_point(35.00000, -80.00000, 0),
            _make_point(35.00001, -80.00000, 15),
            _make_point(35.00000, -80.00001, 30),
            _make_point(35.00001, -80.00001, 45),
        ]
        assert detect_stationary(points) is True

    def test_not_stationary_moving(self):
        # Points spread over ~100m
        points = [
            _make_point(35.000, -80.000, 0),
            _make_point(35.001, -80.000, 15),
            _make_point(35.000, -80.001, 30),
            _make_point(35.001, -80.001, 45),
        ]
        assert detect_stationary(points) is False

    def test_time_span_too_long(self):
        # Stationary but spread over >300s
        points = [
            _make_point(35.00000, -80.00000, 0),
            _make_point(35.00001, -80.00000, 100),
            _make_point(35.00000, -80.00001, 200),
            _make_point(35.00001, -80.00001, 400),
        ]
        assert detect_stationary(points) is False

    def test_custom_threshold(self):
        # Points ~11m apart (0.0001 degrees lat ≈ 11m)
        points = [
            _make_point(35.0000, -80.0, 0),
            _make_point(35.0001, -80.0, 15),
            _make_point(35.0000, -80.0, 30),
            _make_point(35.0001, -80.0, 45),
        ]
        # Default 5m threshold should reject
        assert detect_stationary(points) is False
        # 15m threshold should accept
        assert detect_stationary(points, max_displacement_m=15.0) is True


class TestComputeNoiseFromStationary:
    def test_single_point(self):
        points = [_make_point(35.0, -80.0)]
        assert compute_noise_from_stationary(points) == 0.0

    def test_identical_points(self):
        points = [_make_point(35.0, -80.0, i) for i in range(5)]
        noise = compute_noise_from_stationary(points)
        assert noise < 0.1

    def test_jittery_points(self):
        # Small GPS jitter (~1-2m)
        points = [
            _make_point(35.00000, -80.00000, 0),
            _make_point(35.00001, -80.00000, 15),
            _make_point(35.00000, -80.00001, 30),
            _make_point(35.00001, -80.00001, 45),
            _make_point(35.000005, -80.000005, 60),
        ]
        noise = compute_noise_from_stationary(points)
        assert 0 < noise < 5  # Should be ~1m


class TestUpdateNoiseProfile:
    def test_first_observation(self):
        profile = update_noise_profile(
            existing=None,
            new_noise_radius_m=3.0,
            new_sample_count=5,
            device_id="!aabbccdd",
            timestamp=BASE_TIME,
        )
        assert profile.noise_radius_m == 3.0
        assert profile.sample_count == 5
        assert profile.device_id == "!aabbccdd"
        assert profile.confidence == 5 / 50

    def test_ema_blending(self):
        existing = NoiseProfile(
            device_id="!aabbccdd",
            noise_radius_m=10.0,
            sample_count=50,
            last_updated=BASE_TIME,
            confidence=1.0,
        )
        updated = update_noise_profile(
            existing=existing,
            new_noise_radius_m=4.0,
            new_sample_count=5,
            device_id="!aabbccdd",
            timestamp=BASE_TIME + timedelta(minutes=5),
        )
        # EMA: 0.7 * 10.0 + 0.3 * 4.0 = 8.2
        assert abs(updated.noise_radius_m - 8.2) < 0.01
        assert updated.sample_count == 55
        assert updated.confidence == 1.0

    def test_sample_count_capped(self):
        existing = NoiseProfile(
            device_id="!aabbccdd",
            noise_radius_m=5.0,
            sample_count=998,
            last_updated=BASE_TIME,
            confidence=1.0,
        )
        updated = update_noise_profile(
            existing=existing,
            new_noise_radius_m=5.0,
            new_sample_count=10,
            device_id="!aabbccdd",
            timestamp=BASE_TIME + timedelta(minutes=5),
        )
        assert updated.sample_count == 1000

    def test_confidence_ramps_up(self):
        profile = update_noise_profile(
            existing=None,
            new_noise_radius_m=3.0,
            new_sample_count=25,
            device_id="!aabbccdd",
            timestamp=BASE_TIME,
        )
        assert profile.confidence == 0.5

        profile = update_noise_profile(
            existing=profile,
            new_noise_radius_m=3.0,
            new_sample_count=25,
            device_id="!aabbccdd",
            timestamp=BASE_TIME + timedelta(minutes=5),
        )
        assert profile.confidence == 1.0

    def test_custom_alpha(self):
        existing = NoiseProfile(
            device_id="!aabbccdd",
            noise_radius_m=10.0,
            sample_count=50,
            last_updated=BASE_TIME,
            confidence=1.0,
        )
        updated = update_noise_profile(
            existing=existing,
            new_noise_radius_m=0.0,
            new_sample_count=5,
            device_id="!aabbccdd",
            timestamp=BASE_TIME + timedelta(minutes=5),
            ema_alpha=0.5,
        )
        # EMA: 0.5 * 10.0 + 0.5 * 0.0 = 5.0
        assert abs(updated.noise_radius_m - 5.0) < 0.01
