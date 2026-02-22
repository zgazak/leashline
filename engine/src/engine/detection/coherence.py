"""Motion coherence analysis — distinguishes directed movement from GPS noise."""

from __future__ import annotations

from pydantic import BaseModel, Field

from engine.geo.distance import haversine
from engine.models.position import TrackPoint


class MotionCoherence(BaseModel, frozen=True):
    """Analysis of whether recent motion is coherent (directed) or random (noise)."""

    linearity_ratio: float = Field(
        description="net_displacement / path_length (0=random walk, 1=straight line)"
    )
    displacement_m: float = Field(description="Net first-to-last distance in meters")
    path_length_m: float = Field(description="Sum of consecutive hop distances in meters")
    displacement_significance: float = Field(
        description="displacement / noise_radius — how many noise radii the displacement spans"
    )
    boundary_trend: float = Field(
        description="Average change in boundary distance per step (negative = moving outward)"
    )
    sample_count: int = Field(description="Number of points used")


def compute_motion_coherence(
    points: list[TrackPoint],
    noise_radius_m: float = 8.0,
    boundary_distances: list[float] | None = None,
) -> MotionCoherence | None:
    """Compute motion coherence from a sequence of points.

    Returns None if fewer than 3 points. boundary_distances should be
    parallel to points (signed distance to nearest boundary, positive=inside).
    """
    if len(points) < 3:
        return None

    # Net displacement (first to last)
    first = points[0]
    last = points[-1]
    displacement = haversine(
        first.reading.lat, first.reading.lon,
        last.reading.lat, last.reading.lon,
    )

    # Path length (sum of hops)
    path_length = 0.0
    for i in range(1, len(points)):
        path_length += haversine(
            points[i - 1].reading.lat, points[i - 1].reading.lon,
            points[i].reading.lat, points[i].reading.lon,
        )

    linearity = displacement / path_length if path_length > 0 else 0.0
    significance = displacement / noise_radius_m if noise_radius_m > 0 else 0.0

    # Boundary trend: average change in boundary distance per step
    boundary_trend = 0.0
    if boundary_distances and len(boundary_distances) >= 2:
        deltas = [
            boundary_distances[i] - boundary_distances[i - 1]
            for i in range(1, len(boundary_distances))
        ]
        boundary_trend = sum(deltas) / len(deltas)

    return MotionCoherence(
        linearity_ratio=linearity,
        displacement_m=displacement,
        path_length_m=path_length,
        displacement_significance=significance,
        boundary_trend=boundary_trend,
        sample_count=len(points),
    )


def is_motion_significant(
    coherence: MotionCoherence,
    min_linearity: float = 0.4,
    min_significance: float = 2.0,
) -> bool:
    """Return True if motion is both linear and significant relative to noise."""
    return (
        coherence.linearity_ratio >= min_linearity
        and coherence.displacement_significance >= min_significance
    )
