"""Ray-casting point-in-polygon test."""

from engine.models.geofence import Coordinate


def point_in_polygon(lat: float, lon: float, vertices: list[Coordinate]) -> bool:
    """Determine if a point is inside a polygon using the ray-casting algorithm.

    Casts a ray from the point eastward and counts edge crossings.
    Odd crossings = inside, even = outside.
    """
    n = len(vertices)
    if n < 3:
        return False

    inside = False
    j = n - 1
    for i in range(n):
        yi, xi = vertices[i].lat, vertices[i].lon
        yj, xj = vertices[j].lat, vertices[j].lon

        if ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i

    return inside
