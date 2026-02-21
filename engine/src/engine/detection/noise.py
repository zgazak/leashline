"""GPS noise profiling — learn per-device noise floor from stationary periods."""

from __future__ import annotations

import math
from datetime import datetime

from engine.geo.distance import haversine
from engine.models.noise import NoiseProfile
from engine.models.position import TrackPoint


def detect_stationary(
    points: list[TrackPoint],
    max_displacement_m: float = 5.0,
    min_points: int = 4,
    max_time_span_s: float = 300.0,
) -> bool:
    """Return True if all points are within max_displacement_m of each other.

    Also requires at least min_points and that the time span doesn't exceed
    max_time_span_s (to avoid treating a day of data as one stationary window).
    """
    if len(points) < min_points:
        return False

    time_span = (points[-1].reading.timestamp - points[0].reading.timestamp).total_seconds()
    if time_span > max_time_span_s:
        return False

    for i in range(len(points)):
        for j in range(i + 1, len(points)):
            dist = haversine(
                points[i].reading.lat,
                points[i].reading.lon,
                points[j].reading.lat,
                points[j].reading.lon,
            )
            if dist > max_displacement_m:
                return False
    return True


def compute_noise_from_stationary(points: list[TrackPoint]) -> float:
    """Compute RMS distance from centroid for a set of stationary points.

    Returns the noise radius in meters. Requires at least 2 points.
    """
    if len(points) < 2:
        return 0.0

    n = len(points)
    avg_lat = sum(p.reading.lat for p in points) / n
    avg_lon = sum(p.reading.lon for p in points) / n

    sum_sq = sum(
        haversine(avg_lat, avg_lon, p.reading.lat, p.reading.lon) ** 2
        for p in points
    )
    return math.sqrt(sum_sq / n)


def update_noise_profile(
    existing: NoiseProfile | None,
    new_noise_radius_m: float,
    new_sample_count: int,
    device_id: str,
    timestamp: datetime,
    ema_alpha: float = 0.3,
) -> NoiseProfile:
    """Update a noise profile using exponential moving average blending.

    If no existing profile, uses the new observation directly.
    EMA: blended = (1 - alpha) * old + alpha * new.
    Adapts within ~5-7 observations if GPS quality changes.
    """
    if existing is None:
        return NoiseProfile(
            device_id=device_id,
            noise_radius_m=new_noise_radius_m,
            sample_count=new_sample_count,
            last_updated=timestamp,
            confidence=min(1.0, new_sample_count / 50),
        )

    blended_radius = (1 - ema_alpha) * existing.noise_radius_m + ema_alpha * new_noise_radius_m
    total_samples = min(1000, existing.sample_count + new_sample_count)

    return NoiseProfile(
        device_id=device_id,
        noise_radius_m=blended_radius,
        sample_count=total_samples,
        last_updated=timestamp,
        confidence=min(1.0, total_samples / 50),
    )
