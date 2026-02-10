"""GPS scatter / uncertainty analysis."""

import math

from pydantic import BaseModel, Field

from engine.geo.distance import haversine
from engine.models.position import TrackPoint


class ScatterMetrics(BaseModel, frozen=True):
    """GPS uncertainty estimate from position variance over a sliding window."""

    centroid_lat: float
    centroid_lon: float
    radius_meters: float = Field(description="Standard deviation distance from centroid")
    sample_count: int


def compute_scatter(recent_points: list[TrackPoint]) -> ScatterMetrics | None:
    """Compute scatter metrics from recent track points.

    Returns None if fewer than 2 points.
    """
    if len(recent_points) < 2:
        return None

    n = len(recent_points)
    avg_lat = sum(p.reading.lat for p in recent_points) / n
    avg_lon = sum(p.reading.lon for p in recent_points) / n

    sum_sq = sum(haversine(avg_lat, avg_lon, p.reading.lat, p.reading.lon) ** 2 for p in recent_points)
    radius = math.sqrt(sum_sq / n)

    return ScatterMetrics(centroid_lat=avg_lat, centroid_lon=avg_lon, radius_meters=radius, sample_count=n)
