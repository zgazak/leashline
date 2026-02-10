"""Geofence models."""

from pydantic import BaseModel, Field


class Coordinate(BaseModel, frozen=True):
    """A lat/lon coordinate pair."""

    lat: float
    lon: float


class Geofence(BaseModel, frozen=True):
    """A polygon geofence boundary."""

    id: str = Field(description="Unique geofence identifier")
    name: str = Field(description="Human-readable name")
    vertices: list[Coordinate] = Field(description="Ordered polygon vertices (closed automatically)")
    buffer_meters: float = Field(default=0.0, description="Warning buffer distance outside the fence")
    enabled: bool = Field(default=True)


class BoundaryProximity(BaseModel, frozen=True):
    """Result of a proximity check against a geofence boundary."""

    inside: bool = Field(description="Whether the point is inside the polygon")
    distance_to_boundary_meters: float = Field(description="Distance to nearest boundary edge (positive = inside)")
    nearest_segment_index: int = Field(description="Index of the nearest polygon edge")
    bearing: float = Field(description="Bearing from point to nearest boundary point (degrees)")
