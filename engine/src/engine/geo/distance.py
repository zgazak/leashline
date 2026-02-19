"""Distance and bearing calculations using the Haversine formula."""

import math

EARTH_RADIUS_M = 6_371_000.0


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in meters."""
    rlat1, rlon1, rlat2, rlon2 = map(math.radians, (lat1, lon1, lat2, lon2))
    dlat = rlat2 - rlat1
    dlon = rlon2 - rlon1

    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    return EARTH_RADIUS_M * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the initial bearing from point 1 to point 2 in degrees (0-360)."""
    rlat1, rlon1, rlat2, rlon2 = map(math.radians, (lat1, lon1, lat2, lon2))
    dlon = rlon2 - rlon1

    x = math.sin(dlon) * math.cos(rlat2)
    y = math.cos(rlat1) * math.sin(rlat2) - math.sin(rlat1) * math.cos(rlat2) * math.cos(dlon)

    return (math.degrees(math.atan2(x, y)) + 360) % 360


def point_to_segment_distance(
    px: float, py: float, ax: float, ay: float, bx: float, by: float
) -> tuple[float, float, float]:
    """Find the minimum distance from point P to line segment AB.

    All inputs are lat/lon in decimal degrees.
    Returns (distance_meters, nearest_lat, nearest_lon).

    Projects P onto line AB; if projection falls outside segment,
    uses the nearest endpoint.
    """
    # Work in a local flat approximation (good enough for short segments)
    # Convert to meters relative to A
    cos_lat = math.cos(math.radians(ax))
    m_per_deg_lat = 111_320.0
    m_per_deg_lon = 111_320.0 * cos_lat

    pmx = (py - ay) * m_per_deg_lon
    pmy = (px - ax) * m_per_deg_lat
    bmx = (by - ay) * m_per_deg_lon
    bmy = (bx - ax) * m_per_deg_lat

    seg_len_sq = bmx * bmx + bmy * bmy
    if seg_len_sq < 1e-12:
        # Degenerate segment (A == B)
        return haversine(px, py, ax, ay), ax, ay

    t = max(0.0, min(1.0, (pmx * bmx + pmy * bmy) / seg_len_sq))

    nearest_lat = ax + t * (bx - ax)
    nearest_lon = ay + t * (by - ay)
    dist = haversine(px, py, nearest_lat, nearest_lon)

    return dist, nearest_lat, nearest_lon
