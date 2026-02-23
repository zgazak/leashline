"""Tests for GPS noise profiling."""

from datetime import datetime, timedelta

from engine.detection.noise import (
    compute_noise_from_stationary,
    detect_stationary,
    fix_uncertainty_factor,
    is_altitude_anomaly,
    is_anomalous_jump,
    update_noise_profile,
)
from engine.models.noise import NoiseProfile
from engine.models.position import GpsReading, TrackPoint

BASE_TIME = datetime(2025, 6, 1, 12, 0, 0)


def _make_point(
    lat: float,
    lon: float,
    seconds_offset: float = 0,
    *,
    alt: float | None = None,
    hdop: float | None = None,
    pdop: float | None = None,
    sats: int | None = None,
) -> TrackPoint:
    ts = BASE_TIME + timedelta(seconds=seconds_offset)
    return TrackPoint(
        device_id="!aabbccdd",
        dog_id="rex",
        reading=GpsReading(lat=lat, lon=lon, alt=alt, timestamp=ts, hdop=hdop, pdop=pdop, sats=sats),
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
        # 5m threshold should reject (~11m displacement)
        assert detect_stationary(points, max_displacement_m=5.0) is False
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


class TestFixUncertaintyFactor:
    def test_no_metadata_returns_1(self):
        """No quality metadata → no penalty."""
        p = _make_point(35.0, -80.0)
        assert fix_uncertainty_factor(p) == 1.0

    def test_good_fix_returns_1(self):
        """Good HDOP and plenty of sats → no penalty."""
        p = _make_point(35.0, -80.0, hdop=1.0, sats=10)
        assert fix_uncertainty_factor(p) == 1.0

    def test_high_hdop_inflates(self):
        """HDOP 6.0 with baseline 1.5 → 4× uncertainty."""
        p = _make_point(35.0, -80.0, hdop=6.0)
        factor = fix_uncertainty_factor(p, hdop_baseline=1.5)
        assert abs(factor - 4.0) < 0.01

    def test_low_sats_inflates(self):
        """3 sats with min_sats=6 → 2× uncertainty."""
        p = _make_point(35.0, -80.0, sats=3)
        factor = fix_uncertainty_factor(p, min_sats=6)
        assert abs(factor - 2.0) < 0.01

    def test_hdop_at_baseline_no_penalty(self):
        """HDOP exactly at baseline → 1.0."""
        p = _make_point(35.0, -80.0, hdop=1.5)
        assert fix_uncertainty_factor(p, hdop_baseline=1.5) == 1.0

    def test_combined_takes_worst(self):
        """Both HDOP and sats are bad → use the worse factor."""
        p = _make_point(35.0, -80.0, hdop=4.5, sats=3)
        factor = fix_uncertainty_factor(p, hdop_baseline=1.5, min_sats=6)
        # HDOP factor = 4.5/1.5 = 3.0, sat factor = 6/3 = 2.0 → max = 3.0
        assert abs(factor - 3.0) < 0.01

    def test_capped_at_max(self):
        """Factor is capped at max_factor."""
        p = _make_point(35.0, -80.0, hdop=30.0)
        factor = fix_uncertainty_factor(p, hdop_baseline=1.5, max_factor=5.0)
        assert factor == 5.0

    def test_pdop_inflates(self):
        """High PDOP also inflates uncertainty."""
        p = _make_point(35.0, -80.0, pdop=9.0)
        factor = fix_uncertainty_factor(p, hdop_baseline=1.5)
        # pdop baseline = 1.5 * 1.5 = 2.25; factor = 9.0 / 2.25 = 4.0
        assert abs(factor - 4.0) < 0.01


class TestIsAnomalousJump:
    def test_normal_movement(self):
        """~111m in 15s ≈ 7.4 m/s — normal dog speed."""
        p1 = _make_point(35.000, -80.0, 0)
        p2 = _make_point(35.001, -80.0, 15)
        assert is_anomalous_jump(p1, p2) is False

    def test_teleport(self):
        """~11km in 30s ≈ 370 m/s — GPS glitch."""
        p1 = _make_point(35.000, -80.0, 0)
        p2 = _make_point(35.100, -80.0, 30)
        assert is_anomalous_jump(p1, p2) is True

    def test_zero_time_delta(self):
        """Same timestamp → not anomalous (can't compute speed)."""
        p1 = _make_point(35.000, -80.0, 0)
        p2 = _make_point(35.100, -80.0, 0)
        assert is_anomalous_jump(p1, p2) is False

    def test_borderline_speed(self):
        """~111m in 3s ≈ 37 m/s — just over 30 m/s threshold."""
        p1 = _make_point(35.000, -80.0, 0)
        p2 = _make_point(35.001, -80.0, 3)
        assert is_anomalous_jump(p1, p2) is True

    def test_custom_threshold(self):
        """Custom max speed threshold."""
        p1 = _make_point(35.000, -80.0, 0)
        p2 = _make_point(35.001, -80.0, 3)
        # ~37 m/s, but threshold raised to 50
        assert is_anomalous_jump(p1, p2, max_speed_mps=50.0) is False


class TestAltitudeAnomaly:
    def _history(self, n: int = 6, alt: float = 100.0) -> list[TrackPoint]:
        """Build N points at a consistent altitude."""
        return [_make_point(35.0, -80.0, i * 15, alt=alt) for i in range(n)]

    def test_normal_altitude(self):
        """Current altitude near the median → not anomalous."""
        history = self._history(6, alt=100.0)
        current = _make_point(35.0, -80.0, 100, alt=105.0)
        assert is_altitude_anomaly(history, current, max_deviation_m=50.0) is False

    def test_large_deviation(self):
        """100m above the median → anomalous."""
        history = self._history(6, alt=100.0)
        current = _make_point(35.0, -80.0, 100, alt=200.0)
        assert is_altitude_anomaly(history, current, max_deviation_m=50.0) is True

    def test_alt_none_returns_false(self):
        """Current alt=None → not anomalous (no penalty for missing data)."""
        history = self._history(6, alt=100.0)
        current = _make_point(35.0, -80.0, 100)  # alt=None
        assert is_altitude_anomaly(history, current, max_deviation_m=50.0) is False

    def test_insufficient_history(self):
        """Fewer than min_history points with altitude → not anomalous."""
        history = self._history(3, alt=100.0)  # only 3 < default 5
        current = _make_point(35.0, -80.0, 100, alt=200.0)
        assert is_altitude_anomaly(history, current, max_deviation_m=50.0, min_history=5) is False

    def test_exactly_at_threshold(self):
        """Deviation exactly at threshold → not anomalous (uses strict >)."""
        history = self._history(6, alt=100.0)
        current = _make_point(35.0, -80.0, 100, alt=150.0)  # exactly 50m above median
        assert is_altitude_anomaly(history, current, max_deviation_m=50.0) is False

    def test_history_with_none_alts_filtered(self):
        """Points without altitude in history are ignored, only those with alt count."""
        # 3 with alt, 3 without — only 3 count toward min_history=5
        history = [
            _make_point(35.0, -80.0, 0, alt=100.0),
            _make_point(35.0, -80.0, 15),
            _make_point(35.0, -80.0, 30, alt=100.0),
            _make_point(35.0, -80.0, 45),
            _make_point(35.0, -80.0, 60, alt=100.0),
            _make_point(35.0, -80.0, 75),
        ]
        current = _make_point(35.0, -80.0, 100, alt=200.0)
        assert is_altitude_anomaly(history, current, max_deviation_m=50.0, min_history=5) is False
        # But with min_history=3 it would trigger
        assert is_altitude_anomaly(history, current, max_deviation_m=50.0, min_history=3) is True
