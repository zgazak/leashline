"""GPS noise profiling — learn per-device noise floor from stationary periods."""

from __future__ import annotations

import math
import statistics
from datetime import datetime

from engine.geo.distance import haversine
from engine.models.noise import NoiseProfile
from engine.models.position import TrackPoint


def detect_stationary(
    points: list[TrackPoint],
    max_displacement_m: float = 30.0,
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


def fix_uncertainty_factor(
    point: TrackPoint,
    hdop_baseline: float = 1.5,
    min_sats: int = 6,
    max_factor: float = 5.0,
) -> float:
    """Compute a per-fix uncertainty multiplier from GPS quality metadata.

    Returns a value >= 1.0 that scales the effective noise radius.
    Good fix (many sats, low HDOP) → 1.0. Poor fix → higher.

    When metadata is absent (None), returns 1.0 (no penalty — can't tell).
    """
    factor = 1.0
    reading = point.reading

    # HDOP: ratio against baseline (HDOP 6.0 with baseline 1.5 → 4× uncertainty)
    if reading.hdop is not None and reading.hdop > hdop_baseline:
        factor = max(factor, reading.hdop / hdop_baseline)

    # PDOP: same logic, slightly more conservative baseline
    if reading.pdop is not None and reading.pdop > hdop_baseline * 1.5:
        factor = max(factor, reading.pdop / (hdop_baseline * 1.5))

    # Low satellite count: fewer sats → proportionally worse
    if reading.sats is not None and reading.sats > 0 and reading.sats < min_sats:
        factor = max(factor, min_sats / reading.sats)

    return min(factor, max_factor)


def is_altitude_anomaly(
    recent_points: list[TrackPoint],
    current: TrackPoint,
    max_deviation_m: float = 50.0,
    min_history: int = 5,
) -> bool:
    """Return True if the current point's altitude deviates too far from the running median.

    Uses median altitude from recent_points (filtering to those with alt != None).
    Returns False if current.alt is None or insufficient altitude history — no
    penalty for missing data.
    """
    if current.reading.alt is None:
        return False

    alt_values = [p.reading.alt for p in recent_points if p.reading.alt is not None]
    if len(alt_values) < min_history:
        return False

    median_alt = statistics.median(alt_values)
    return abs(current.reading.alt - median_alt) > max_deviation_m


def is_anomalous_jump(
    prev: TrackPoint,
    curr: TrackPoint,
    max_speed_mps: float = 30.0,
) -> bool:
    """Return True if the implied speed between two points is physically impossible.

    Default 30 m/s ≈ 67 mph — generous for any dog, catches GPS teleports.
    """
    dt = (curr.reading.timestamp - prev.reading.timestamp).total_seconds()
    if dt <= 0:
        return False

    dist = haversine(
        prev.reading.lat, prev.reading.lon,
        curr.reading.lat, curr.reading.lon,
    )
    return (dist / dt) > max_speed_mps


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
