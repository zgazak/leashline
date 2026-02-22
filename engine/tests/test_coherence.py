"""Tests for motion coherence analysis."""

from datetime import datetime, timedelta

from engine.detection.coherence import (
    MotionCoherence,
    compute_motion_coherence,
    is_motion_significant,
)
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


class TestComputeMotionCoherence:
    def test_too_few_points(self):
        points = [_make_point(35.0, -80.0, 0), _make_point(35.0, -80.0, 15)]
        assert compute_motion_coherence(points) is None

    def test_straight_line_north(self):
        # Moving straight north: ~111m per 0.001 degrees
        points = [
            _make_point(35.000, -80.0, 0),
            _make_point(35.001, -80.0, 15),
            _make_point(35.002, -80.0, 30),
        ]
        coherence = compute_motion_coherence(points)
        assert coherence is not None
        assert coherence.linearity_ratio > 0.95  # Nearly straight
        assert coherence.displacement_m > 200  # ~222m
        assert coherence.sample_count == 3

    def test_random_walk(self):
        # Zigzag path — low linearity
        points = [
            _make_point(35.000, -80.000, 0),
            _make_point(35.001, -80.001, 15),
            _make_point(35.000, -80.000, 30),
            _make_point(35.001, -80.001, 45),
            _make_point(35.000, -80.000, 60),
        ]
        coherence = compute_motion_coherence(points)
        assert coherence is not None
        assert coherence.linearity_ratio < 0.1  # Very low — back to start

    def test_displacement_significance(self):
        # Points moving ~222m with noise_radius=8m
        points = [
            _make_point(35.000, -80.0, 0),
            _make_point(35.001, -80.0, 15),
            _make_point(35.002, -80.0, 30),
        ]
        coherence = compute_motion_coherence(points, noise_radius_m=8.0)
        assert coherence is not None
        assert coherence.displacement_significance > 20  # 222/8 ≈ 27.8

    def test_boundary_trend_moving_out(self):
        points = [
            _make_point(35.000, -80.0, 0),
            _make_point(35.001, -80.0, 15),
            _make_point(35.002, -80.0, 30),
        ]
        # Boundary distances decreasing = moving outward (toward negative)
        boundary_distances = [5.0, 0.0, -10.0]
        coherence = compute_motion_coherence(points, boundary_distances=boundary_distances)
        assert coherence is not None
        assert coherence.boundary_trend < 0  # Moving outward

    def test_boundary_trend_moving_in(self):
        points = [
            _make_point(35.000, -80.0, 0),
            _make_point(35.001, -80.0, 15),
            _make_point(35.002, -80.0, 30),
        ]
        # Boundary distances increasing = moving inward
        boundary_distances = [-10.0, 0.0, 5.0]
        coherence = compute_motion_coherence(points, boundary_distances=boundary_distances)
        assert coherence is not None
        assert coherence.boundary_trend > 0  # Moving inward

    def test_no_boundary_distances(self):
        points = [
            _make_point(35.000, -80.0, 0),
            _make_point(35.001, -80.0, 15),
            _make_point(35.002, -80.0, 30),
        ]
        coherence = compute_motion_coherence(points)
        assert coherence is not None
        assert coherence.boundary_trend == 0.0

    def test_stationary_points(self):
        # All at same location
        points = [_make_point(35.0, -80.0, i * 15) for i in range(5)]
        coherence = compute_motion_coherence(points)
        assert coherence is not None
        assert coherence.linearity_ratio == 0.0
        assert coherence.displacement_m < 0.1


class TestIsMotionSignificant:
    def test_significant(self):
        coherence = MotionCoherence(
            linearity_ratio=0.8,
            displacement_m=50.0,
            path_length_m=60.0,
            displacement_significance=5.0,
            boundary_trend=-2.0,
            sample_count=5,
        )
        assert is_motion_significant(coherence) is True

    def test_low_linearity(self):
        coherence = MotionCoherence(
            linearity_ratio=0.2,
            displacement_m=50.0,
            path_length_m=250.0,
            displacement_significance=5.0,
            boundary_trend=-2.0,
            sample_count=5,
        )
        assert is_motion_significant(coherence) is False

    def test_low_significance(self):
        coherence = MotionCoherence(
            linearity_ratio=0.8,
            displacement_m=5.0,
            path_length_m=6.0,
            displacement_significance=0.5,
            boundary_trend=-2.0,
            sample_count=5,
        )
        assert is_motion_significant(coherence) is False

    def test_custom_thresholds(self):
        coherence = MotionCoherence(
            linearity_ratio=0.3,
            displacement_m=20.0,
            path_length_m=66.0,
            displacement_significance=1.5,
            boundary_trend=-1.0,
            sample_count=5,
        )
        # Fails with defaults but passes with lower thresholds
        assert is_motion_significant(coherence) is False
        assert is_motion_significant(coherence, min_linearity=0.2, min_significance=1.0) is True
