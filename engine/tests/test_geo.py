"""Tests for geo algorithms."""

import math

from engine.geo.boundary import distance_to_nearest_boundary
from engine.geo.distance import bearing, haversine, point_to_segment_distance
from engine.geo.point_in_polygon import point_in_polygon
from engine.models.geofence import Coordinate

# A simple square geofence centered roughly at (35.0, -80.0)
# ~111m per 0.001 degree of latitude at this latitude
SQUARE = [
    Coordinate(lat=35.000, lon=-80.001),
    Coordinate(lat=35.000, lon=-79.999),
    Coordinate(lat=35.002, lon=-79.999),
    Coordinate(lat=35.002, lon=-80.001),
]


class TestPointInPolygon:
    def test_inside(self):
        assert point_in_polygon(35.001, -80.000, SQUARE) is True

    def test_outside(self):
        assert point_in_polygon(35.005, -80.000, SQUARE) is False

    def test_outside_south(self):
        assert point_in_polygon(34.999, -80.000, SQUARE) is False

    def test_degenerate_polygon(self):
        assert point_in_polygon(0, 0, [Coordinate(lat=0, lon=0), Coordinate(lat=1, lon=1)]) is False

    def test_triangle(self):
        tri = [Coordinate(lat=0, lon=0), Coordinate(lat=0, lon=2), Coordinate(lat=2, lon=1)]
        assert point_in_polygon(0.5, 1.0, tri) is True
        assert point_in_polygon(3.0, 1.0, tri) is False


class TestHaversine:
    def test_same_point(self):
        assert haversine(35.0, -80.0, 35.0, -80.0) == 0.0

    def test_known_distance(self):
        # ~111 km between 1 degree of latitude
        d = haversine(0.0, 0.0, 1.0, 0.0)
        assert abs(d - 111_195) < 100  # within 100m

    def test_short_distance(self):
        # 0.001 degrees lat ~ 111m
        d = haversine(35.0, -80.0, 35.001, -80.0)
        assert 100 < d < 120


class TestBearing:
    def test_north(self):
        b = bearing(0.0, 0.0, 1.0, 0.0)
        assert abs(b - 0.0) < 1.0

    def test_east(self):
        b = bearing(0.0, 0.0, 0.0, 1.0)
        assert abs(b - 90.0) < 1.0

    def test_south(self):
        b = bearing(1.0, 0.0, 0.0, 0.0)
        assert abs(b - 180.0) < 1.0

    def test_west(self):
        b = bearing(0.0, 1.0, 0.0, 0.0)
        assert abs(b - 270.0) < 1.0


class TestPointToSegment:
    def test_perpendicular(self):
        # Segment from (0,0) to (0,1), point at (1, 0.5) — nearest should be (0, 0.5)
        dist, nlat, nlon = point_to_segment_distance(1.0, 0.5, 0.0, 0.0, 0.0, 1.0)
        # ~111 km
        assert dist > 100_000

    def test_endpoint(self):
        # Point near one endpoint
        dist, nlat, nlon = point_to_segment_distance(0.0, 0.0, 0.0, 1.0, 0.0, 2.0)
        # Nearest should be (0.0, 1.0)
        assert abs(nlat - 0.0) < 0.001
        assert abs(nlon - 1.0) < 0.001

    def test_degenerate_segment(self):
        dist, nlat, nlon = point_to_segment_distance(1.0, 1.0, 0.0, 0.0, 0.0, 0.0)
        assert dist > 0
        assert nlat == 0.0
        assert nlon == 0.0


class TestBoundary:
    def test_inside_point(self):
        result = distance_to_nearest_boundary(35.001, -80.000, SQUARE)
        assert result.inside is True
        assert result.distance_to_boundary_meters > 0

    def test_outside_point(self):
        result = distance_to_nearest_boundary(35.005, -80.000, SQUARE)
        assert result.inside is False
        assert result.distance_to_boundary_meters < 0

    def test_near_boundary(self):
        # Just inside the south edge
        result = distance_to_nearest_boundary(35.0001, -80.000, SQUARE)
        assert result.inside is True
        assert result.distance_to_boundary_meters < 20  # should be ~11m

    def test_raises_on_degenerate(self):
        try:
            distance_to_nearest_boundary(0, 0, [Coordinate(lat=0, lon=0)])
            assert False, "Should have raised"
        except ValueError:
            pass
