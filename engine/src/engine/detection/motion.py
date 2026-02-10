"""Motion vector analysis from recent track points."""

from pydantic import BaseModel, Field

from engine.geo.distance import bearing, haversine
from engine.models.position import TrackPoint


class MotionVector(BaseModel, frozen=True):
    """Computed motion summary from recent positions."""

    speed_mps: float = Field(description="Average speed in meters per second")
    heading: float = Field(description="Bearing of motion in degrees (0-360)")
    sample_count: int = Field(description="Number of points used")


def compute_motion_vector(recent_points: list[TrackPoint]) -> MotionVector | None:
    """Compute a motion vector from a list of recent track points (oldest first).

    Returns None if fewer than 2 points.
    """
    if len(recent_points) < 2:
        return None

    first = recent_points[0]
    last = recent_points[-1]

    dt = (last.reading.timestamp - first.reading.timestamp).total_seconds()
    if dt <= 0:
        return None

    dist = haversine(first.reading.lat, first.reading.lon, last.reading.lat, last.reading.lon)
    brg = bearing(first.reading.lat, first.reading.lon, last.reading.lat, last.reading.lon)
    speed = dist / dt

    return MotionVector(speed_mps=speed, heading=brg, sample_count=len(recent_points))
