"""Boundary proximity calculations."""

from engine.geo.distance import bearing, point_to_segment_distance
from engine.geo.point_in_polygon import point_in_polygon
from engine.models.geofence import BoundaryProximity, Coordinate


def distance_to_nearest_boundary(lat: float, lon: float, vertices: list[Coordinate]) -> BoundaryProximity:
    """Calculate the proximity of a point to the nearest edge of a polygon.

    Returns a BoundaryProximity with signed distance:
    positive = inside the polygon, negative = outside.
    """
    n = len(vertices)
    if n < 3:
        raise ValueError("Polygon must have at least 3 vertices")

    inside = point_in_polygon(lat, lon, vertices)

    best_dist = float("inf")
    best_idx = 0
    best_lat = vertices[0].lat
    best_lon = vertices[0].lon

    for i in range(n):
        j = (i + 1) % n
        dist, nlat, nlon = point_to_segment_distance(
            lat, lon, vertices[i].lat, vertices[i].lon, vertices[j].lat, vertices[j].lon
        )
        if dist < best_dist:
            best_dist = dist
            best_idx = i
            best_lat = nlat
            best_lon = nlon

    signed_distance = best_dist if inside else -best_dist
    brg = bearing(lat, lon, best_lat, best_lon)

    return BoundaryProximity(
        inside=inside,
        distance_to_boundary_meters=signed_distance,
        nearest_segment_index=best_idx,
        bearing=brg,
    )
