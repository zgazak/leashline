"""Adaptive GPS sampling interval based on boundary proximity."""

from pydantic import BaseModel, Field


class SamplingConfig(BaseModel, frozen=True):
    """Configuration for adaptive sampling intervals."""

    min_interval_s: int = Field(default=5, description="Minimum GPS interval when near boundary")
    max_interval_s: int = Field(default=60, description="Maximum GPS interval when far from boundary")
    near_boundary_m: float = Field(default=10.0, description="Distance at which min interval applies")
    far_boundary_m: float = Field(default=200.0, description="Distance at which max interval applies")


def compute_desired_interval(distance_to_boundary_m: float, config: SamplingConfig) -> int:
    """Compute the desired GPS sampling interval based on proximity to the nearest boundary.

    Uses linear interpolation between min and max intervals.
    """
    if distance_to_boundary_m <= config.near_boundary_m:
        return config.min_interval_s
    if distance_to_boundary_m >= config.far_boundary_m:
        return config.max_interval_s

    ratio = (distance_to_boundary_m - config.near_boundary_m) / (config.far_boundary_m - config.near_boundary_m)
    return int(config.min_interval_s + ratio * (config.max_interval_s - config.min_interval_s))
