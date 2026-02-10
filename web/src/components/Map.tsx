"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Geofence, TrackPoint } from "@/lib/types";

interface MapProps {
  positions: Record<string, TrackPoint>;
  geofences: Geofence[];
  focusDogId: string | null;
  dogNames: Record<string, string>;
}

export default function Map({
  positions,
  geofences,
  focusDogId,
  dogNames,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});

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

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, [token]);

  // Draw geofences
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

      geofences.forEach((gf) => {
        if (!gf.enabled || gf.vertices.length < 3) return;
        const coords = gf.vertices.map((v) => [v.lon, v.lat] as [number, number]);
        coords.push(coords[0]); // close polygon

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
            "fill-color": "#3b82f6",
            "fill-opacity": 0.15,
          },
        });

        map.addLayer({
          id: `geofence-line-${gf.id}`,
          type: "line",
          source: gf.id,
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2,
          },
        });
      });
    };

    if (map.isStyleLoaded()) {
      handler();
    } else {
      map.on("style.load", handler);
    }
  }, [geofences]);

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
      if (markersRef.current[deviceId]) {
        markersRef.current[deviceId].setLngLat([tp.reading.lon, tp.reading.lat]);
      } else {
        const el = document.createElement("div");
        el.className = "dog-marker";
        el.style.cssText =
          "width:32px;height:32px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:12px;cursor:pointer;";
        el.textContent = name.slice(0, 2).toUpperCase();

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([tp.reading.lon, tp.reading.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 20 }).setHTML(
              `<strong>${name}</strong><br/>RSSI: ${tp.rssi ?? "—"} / SNR: ${tp.snr ?? "—"}`,
            ),
          )
          .addTo(map);
        markersRef.current[deviceId] = marker;
      }
    }
  }, [positions, dogNames]);

  // Focus on escaping dog
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusDogId) return;

    // Find position by dog_id match
    const tp = Object.values(positions).find((p) => p.dog_id === focusDogId);
    if (tp) {
      map.flyTo({ center: [tp.reading.lon, tp.reading.lat], zoom: 16, speed: 2 });
    }
  }, [focusDogId, positions]);

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100 text-gray-500">
        <div className="text-center p-8">
          <p className="text-lg font-semibold mb-2">Mapbox token not set</p>
          <p className="text-sm">
            Set <code className="bg-gray-200 px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
            <code className="bg-gray-200 px-1 rounded">web/.env.local</code>
          </p>
          <p className="text-sm mt-1">
            Get a free token at{" "}
            <span className="underline">mapbox.com</span>
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="flex-1 w-full h-full" />;
}
