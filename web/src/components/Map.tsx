"use client";

import { useCallback, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import type { Coordinate, DeviceTelemetry, Geofence, NoiseProfile, TrackPoint } from "@/lib/types";
import { GEOFENCE_COLORS } from "@/components/GeofenceList";

interface MapProps {
  positions: Record<string, TrackPoint>;
  trails?: Record<string, TrackPoint[]>;
  noiseProfiles?: Record<string, NoiseProfile>;
  telemetry?: Record<string, DeviceTelemetry>;
  geofences: Geofence[];
  focusDogId: string | null;
  dogNames: Record<string, string>;
  drawingMode?: boolean;
  editingGeofenceId?: string | null;
  onPolygonComplete?: (vertices: Coordinate[]) => void;
  onPolygonUpdated?: (geofenceId: string, vertices: Coordinate[]) => void;
  onDrawCancel?: () => void;
  onMapInteraction?: () => void;
  bottomPadding?: number;
}

/** Generate a GeoJSON polygon approximating a circle. */
function geoCircle(lat: number, lon: number, radiusMeters: number, steps = 64): GeoJSON.Polygon {
  const coords: [number, number][] = [];
  const earthRadius = 6371000;
  for (let i = 0; i <= steps; i++) {
    const angle = (2 * Math.PI * i) / steps;
    const dLat = (radiusMeters * Math.cos(angle)) / earthRadius;
    const dLon = (radiusMeters * Math.sin(angle)) / (earthRadius * Math.cos((lat * Math.PI) / 180));
    coords.push([lon + (dLon * 180) / Math.PI, lat + (dLat * 180) / Math.PI]);
  }
  return { type: "Polygon", coordinates: [coords] };
}

function coordsFromFeature(feature: GeoJSON.Feature<GeoJSON.Polygon>): Coordinate[] {
  const ring = feature.geometry.coordinates[0];
  // GeoJSON rings are closed (last == first), drop the closing vertex
  return ring.slice(0, -1).map(([lng, lat]) => ({ lat, lon: lng }));
}

export default function Map({
  positions,
  trails,
  noiseProfiles,
  telemetry,
  geofences,
  focusDogId,
  dogNames,
  drawingMode,
  editingGeofenceId,
  onPolygonComplete,
  onPolygonUpdated,
  onDrawCancel,
  onMapInteraction,
  bottomPadding,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const drawRef = useRef<MapboxDraw | null>(null);
  const editingIdRef = useRef<string | null>(null);
  const hasAutoZoomedRef = useRef(false);

  // Store callbacks in refs so draw event handlers always see latest
  const onPolygonCompleteRef = useRef(onPolygonComplete);
  onPolygonCompleteRef.current = onPolygonComplete;
  const onPolygonUpdatedRef = useRef(onPolygonUpdated);
  onPolygonUpdatedRef.current = onPolygonUpdated;
  const onMapInteractionRef = useRef(onMapInteraction);
  onMapInteractionRef.current = onMapInteraction;

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || !token) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-98.5, 39.8],
      zoom: 4,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "top-right",
    );

    mapRef.current = map;

    // Add trail + uncertainty sources/layers once style loads
    map.on("style.load", () => {
      // Uncertainty circles (bottom layer)
      map.addSource("uncertainty-circles", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "uncertainty-fill",
        type: "fill",
        source: "uncertainty-circles",
        paint: { "fill-color": "#3b82f6", "fill-opacity": 0.08 },
      });
      map.addLayer({
        id: "uncertainty-outline",
        type: "line",
        source: "uncertainty-circles",
        paint: { "line-color": "#3b82f6", "line-opacity": 0.3, "line-width": 1.5, "line-dasharray": [4, 3] },
      });

      // Trail lines
      map.addSource("trail-lines", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "trail-lines-layer",
        type: "line",
        source: "trail-lines",
        paint: { "line-color": "#ef4444", "line-opacity": 0.4, "line-width": 2 },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      // Trail dots
      map.addSource("trail-dots", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "trail-dots-layer",
        type: "circle",
        source: "trail-dots",
        paint: {
          "circle-color": "#ef4444",
          "circle-radius": ["get", "radius"],
          "circle-opacity": ["get", "opacity"],
        },
      });
    });

    // Collapse bottom sheet on map interaction
    map.on("dragstart", () => onMapInteractionRef.current?.());
    map.on("click", () => onMapInteractionRef.current?.());

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      drawRef.current = null;
    };
  }, [token]);

  // Draw geofences (static layers)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handler = () => {
      // Remove old geofence layers/sources
      geofences.forEach((gf) => {
        const fillId = `geofence-fill-${gf.id}`;
        const lineId = `geofence-line-${gf.id}`;
        if (map.getLayer(fillId)) map.removeLayer(fillId);
        if (map.getLayer(lineId)) map.removeLayer(lineId);
        if (map.getSource(gf.id)) map.removeSource(gf.id);
      });

      geofences.forEach((gf, i) => {
        // Skip the geofence being edited (drawn in MapboxDraw instead)
        if (editingGeofenceId === gf.id) return;
        if (!gf.enabled || gf.vertices.length < 3) return;
        const coords = gf.vertices.map(
          (v) => [v.lon, v.lat] as [number, number],
        );
        coords.push(coords[0]); // close polygon

        const color = GEOFENCE_COLORS[i % GEOFENCE_COLORS.length];

        map.addSource(gf.id, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: { name: gf.name },
            geometry: { type: "Polygon", coordinates: [coords] },
          },
        });

        map.addLayer({
          id: `geofence-fill-${gf.id}`,
          type: "fill",
          source: gf.id,
          paint: {
            "fill-color": color,
            "fill-opacity": 0.15,
          },
        });

        map.addLayer({
          id: `geofence-line-${gf.id}`,
          type: "line",
          source: gf.id,
          paint: {
            "line-color": color,
            "line-width": 2,
            ...(gf.zone_type === "label" ? { "line-dasharray": [4, 3] } : {}),
          },
        });
      });
    };

    if (map.isStyleLoaded()) {
      handler();
    } else {
      map.on("style.load", handler);
    }
  }, [geofences, editingGeofenceId]);

  // Handle draw mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const initDraw = () => {
      if (drawingMode || editingGeofenceId) {
        if (!drawRef.current) {
          const draw = new MapboxDraw({
            displayControlsDefault: false,
            defaultMode: "simple_select",
          });
          map.addControl(draw as unknown as mapboxgl.IControl);
          drawRef.current = draw;

          // Handle polygon creation
          map.on("draw.create", (e: { features: GeoJSON.Feature[] }) => {
            const feature = e.features[0] as GeoJSON.Feature<GeoJSON.Polygon>;
            if (feature && feature.geometry.type === "Polygon") {
              const vertices = coordsFromFeature(feature);
              onPolygonCompleteRef.current?.(vertices);
              // Clean up drawn features
              draw.deleteAll();
            }
          });

          // Handle polygon update (edit mode)
          map.on("draw.update", (e: { features: GeoJSON.Feature[] }) => {
            const feature = e.features[0] as GeoJSON.Feature<GeoJSON.Polygon>;
            if (feature && feature.geometry.type === "Polygon" && editingIdRef.current) {
              const vertices = coordsFromFeature(feature);
              onPolygonUpdatedRef.current?.(editingIdRef.current, vertices);
            }
          });
        }

        const draw = drawRef.current;

        if (drawingMode) {
          editingIdRef.current = null;
          draw.deleteAll();
          draw.changeMode("draw_polygon");
        } else if (editingGeofenceId) {
          editingIdRef.current = editingGeofenceId;
          const gf = geofences.find((g) => g.id === editingGeofenceId);
          if (gf && gf.vertices.length >= 3) {
            draw.deleteAll();
            const coords = gf.vertices.map(
              (v) => [v.lon, v.lat] as [number, number],
            );
            coords.push(coords[0]); // close ring
            const featureIds = draw.add({
              type: "Feature",
              properties: {},
              geometry: { type: "Polygon", coordinates: [coords] },
            });
            if (featureIds.length > 0) {
              draw.changeMode("direct_select", {
                featureId: featureIds[0],
              });
            }
          }
        }
      } else {
        // Exit draw mode: remove draw control
        if (drawRef.current) {
          drawRef.current.deleteAll();
          map.removeControl(drawRef.current as unknown as mapboxgl.IControl);
          drawRef.current = null;
          editingIdRef.current = null;
        }
      }
    };

    if (map.isStyleLoaded()) {
      initDraw();
    } else {
      map.on("style.load", initDraw);
    }
  }, [drawingMode, editingGeofenceId, geofences]);

  // Handle Escape key to cancel draw
  useEffect(() => {
    if (!drawingMode && !editingGeofenceId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDrawCancel?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawingMode, editingGeofenceId, onDrawCancel]);

  // Update dog markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentDevices = new Set(Object.keys(positions));

    // Remove stale markers
    for (const id of Object.keys(markersRef.current)) {
      if (!currentDevices.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    }

    // Add/update markers
    for (const [deviceId, tp] of Object.entries(positions)) {
      const name = dogNames[deviceId] || deviceId.slice(-4);
      const telem = telemetry?.[deviceId];
      const batteryHtml = telem?.battery_level != null
        ? `<br/>Battery: ${telem.battery_level}%${telem.voltage != null ? ` (${telem.voltage.toFixed(1)}V)` : ""}`
        : "";
      const popupHtml = `<strong>${name}</strong><br/>RSSI: ${tp.rssi ?? "\u2014"} / SNR: ${tp.snr ?? "\u2014"}${batteryHtml}`;

      if (markersRef.current[deviceId]) {
        markersRef.current[deviceId].setLngLat([
          tp.reading.lon,
          tp.reading.lat,
        ]);
        const popup = markersRef.current[deviceId].getPopup();
        if (popup) popup.setHTML(popupHtml);
      } else {
        const el = document.createElement("div");
        el.className = "dog-marker";
        el.style.cssText =
          "width:32px;height:32px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:12px;cursor:pointer;";
        el.textContent = name.slice(0, 2).toUpperCase();

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([tp.reading.lon, tp.reading.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 20 }).setHTML(popupHtml),
          )
          .addTo(map);
        markersRef.current[deviceId] = marker;
      }
    }

  }, [positions, telemetry, dogNames]);

  // Update trail lines + dots
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !trails) return;

    const lineFeatures: GeoJSON.Feature[] = [];
    const dotFeatures: GeoJSON.Feature[] = [];
    const dotSizes = [6, 5, 4, 3];
    const dotOpacities = [0.7, 0.5, 0.35, 0.25];

    for (const [deviceId, pts] of Object.entries(trails)) {
      if (pts.length < 2) continue;
      // Start the line from the live position (may be fresher than trails)
      const live = positions[deviceId];
      const lineCoords: [number, number][] = [];
      if (live) lineCoords.push([live.reading.lon, live.reading.lat]);
      for (const p of pts) lineCoords.push([p.reading.lon, p.reading.lat]);
      lineFeatures.push({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: lineCoords },
      });
      // Dots for older positions (skip index 0 — that's the current marker)
      for (let i = 1; i < pts.length; i++) {
        dotFeatures.push({
          type: "Feature",
          properties: { radius: dotSizes[i - 1] ?? 3, opacity: dotOpacities[i - 1] ?? 0.2 },
          geometry: { type: "Point", coordinates: [pts[i].reading.lon, pts[i].reading.lat] },
        });
      }
    }

    const setData = () => {
      const lineSrc = map.getSource("trail-lines") as mapboxgl.GeoJSONSource | undefined;
      const dotSrc = map.getSource("trail-dots") as mapboxgl.GeoJSONSource | undefined;
      if (lineSrc) lineSrc.setData({ type: "FeatureCollection", features: lineFeatures });
      if (dotSrc) dotSrc.setData({ type: "FeatureCollection", features: dotFeatures });
    };

    if (map.isStyleLoaded()) setData();
    else map.on("style.load", setData);
  }, [trails, positions]);

  // Update uncertainty circles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const features: GeoJSON.Feature[] = [];
    const now = Date.now();

    for (const [deviceId, tp] of Object.entries(positions)) {
      const profile = noiseProfiles?.[deviceId];
      const noiseRadius = profile?.noise_radius_m ?? 8;
      const sats = tp.reading.sats ?? 4;
      const hdop = tp.reading.hdop ?? 2;
      const fixFactor = Math.min(5, Math.max(1, hdop / 1.5, 6 / sats));
      const elapsedSec = (now - new Date(tp.received_at).getTime()) / 1000;
      const timeExpansion = Math.max(0, elapsedSec) * 0.5;
      const radius = Math.min(500, noiseRadius * fixFactor + timeExpansion);

      features.push({
        type: "Feature",
        properties: {},
        geometry: geoCircle(tp.reading.lat, tp.reading.lon, radius),
      });
    }

    const setData = () => {
      const src = map.getSource("uncertainty-circles") as mapboxgl.GeoJSONSource | undefined;
      if (src) src.setData({ type: "FeatureCollection", features });
    };

    if (map.isStyleLoaded()) setData();
    else map.on("style.load", setData);
  }, [positions, noiseProfiles]);

  // Auto-zoom to dog positions on first data (~300m view)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || hasAutoZoomedRef.current) return;
    if (Object.keys(positions).length === 0) return;

    const doZoom = () => {
      if (hasAutoZoomedRef.current) return;
      hasAutoZoomedRef.current = true;
      const pts = Object.values(positions);
      if (pts.length === 1) {
        map.flyTo({ center: [pts[0].reading.lon, pts[0].reading.lat], zoom: 17, speed: 2 });
      } else {
        const bounds = new mapboxgl.LngLatBounds();
        for (const tp of pts) {
          bounds.extend([tp.reading.lon, tp.reading.lat]);
        }
        map.fitBounds(bounds, { padding: 80, maxZoom: 17 });
      }
    };

    if (map.loaded()) {
      doZoom();
    } else {
      map.on("load", doZoom);
      return () => { map.off("load", doZoom); };
    }
  }, [positions]);

  // Focus on escaping dog
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusDogId) return;

    // Find position by dog_id match
    const tp = Object.values(positions).find((p) => p.dog_id === focusDogId);
    if (tp) {
      map.flyTo({
        center: [tp.reading.lon, tp.reading.lat],
        zoom: 16,
        speed: 2,
      });
    }
  }, [focusDogId, positions]);

  // Adjust map padding for bottom sheet
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setPadding({ top: 0, left: 0, right: 0, bottom: bottomPadding ?? 0 });
  }, [bottomPadding]);

  if (!token) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
        <div className="text-center p-8">
          <p className="text-lg font-semibold mb-2">Mapbox token not set</p>
          <p className="text-sm">
            Set{" "}
            <code className="bg-gray-200 px-1 rounded">
              NEXT_PUBLIC_MAPBOX_TOKEN
            </code>{" "}
            in <code className="bg-gray-200 px-1 rounded">web/.env.local</code>
          </p>
          <p className="text-sm mt-1">
            Get a free token at <span className="underline">mapbox.com</span>
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
