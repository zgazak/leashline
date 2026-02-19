/**
 * Ray-casting point-in-polygon test.
 * Port of engine/src/engine/geo/point_in_polygon.py
 */

import type { Coordinate } from "./types";

export function pointInPolygon(lat: number, lon: number, vertices: Coordinate[]): boolean {
  const n = vertices.length;
  if (n < 3) return false;

  let inside = false;
  let j = n - 1;
  for (let i = 0; i < n; i++) {
    const yi = vertices[i].lat, xi = vertices[i].lon;
    const yj = vertices[j].lat, xj = vertices[j].lon;

    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
    j = i;
  }
  return inside;
}
