"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useApi } from "@/lib/api-provider";
import type { Coordinate, DogProfile, Geofence, Pack } from "@/lib/types";
import { pointInPolygon } from "@/lib/geo";
import { useAlerts } from "@/hooks/useAlerts";
import { useConnection } from "@/hooks/useConnection";
import { usePositions } from "@/hooks/usePositions";
import AlertList from "@/components/AlertList";
import ConnectionStatus from "@/components/ConnectionStatus";
import ConnectionSwitcher from "@/components/ConnectionSwitcher";
import CreateGeofenceModal from "@/components/CreateGeofenceModal";
import DogList from "@/components/DogList";
import GeofenceList from "@/components/GeofenceList";
import NotificationToggle from "@/components/NotificationToggle";
import PackSetup from "@/components/PackSetup";
import PackSettings from "@/components/PackSettings";
import Sidebar from "@/components/Sidebar";

// Load Map client-only (mapbox-gl needs window)
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const api = useApi();

  const [dogs, setDogs] = useState<DogProfile[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showPackSettings, setShowPackSettings] = useState(false);
  const [focusDogId, setFocusDogId] = useState<string | null>(null);
  const [needsPack, setNeedsPack] = useState(false);
  const [ready, setReady] = useState(false);

  // Geofence drawing state
  const [drawingMode, setDrawingMode] = useState(false);
  const [editingGeofenceId, setEditingGeofenceId] = useState<string | null>(
    null,
  );
  const [pendingVertices, setPendingVertices] = useState<Coordinate[] | null>(
    null,
  );

  const positions = usePositions(api);
  const alerts = useAlerts(api);
  const connectionState = useConnection(api);

  useEffect(() => {
    // Try loading dogs — if 403, user needs a pack
    api
      .listDogs()
      .then((d) => {
        setDogs(d);
        setReady(true);
      })
      .catch((e: Error) => {
        if (e.message.startsWith("403")) {
          setNeedsPack(true);
        }
        setReady(true);
      });
    api.listGeofences().then(setGeofences).catch(() => {});
  }, [api]);

  // Build device_id → dog name lookup
  const dogNames = useMemo(() => {
    const m: Record<string, string> = {};
    for (const d of dogs) {
      if (d.device_id) m[d.device_id] = d.name;
    }
    return m;
  }, [dogs]);

  // Build dog_id → zone name lookup (client-side PiP against assigned geofences)
  const dogZones = useMemo(() => {
    const m: Record<string, string> = {};
    for (const dog of dogs) {
      if (!dog.device_id) continue;
      const tp = positions[dog.device_id];
      if (!tp) continue;
      for (const gfId of dog.geofence_ids) {
        const gf = geofences.find((g) => g.id === gfId);
        if (!gf || !gf.enabled || gf.vertices.length < 3) continue;
        if (pointInPolygon(tp.reading.lat, tp.reading.lon, gf.vertices)) {
          m[dog.id] = gf.name;
          break;
        }
      }
    }
    return m;
  }, [dogs, positions, geofences]);

  // Auto-detect escape alerts → enter tracking mode
  useEffect(() => {
    const escape = alerts.find(
      (a) => a.level === "escape" && !a.acknowledged,
    );
    if (escape && focusDogId !== escape.dog_id) {
      setFocusDogId(escape.dog_id);
    }
  }, [alerts, focusDogId]);

  const handleDogAdded = useCallback((dog: DogProfile) => {
    setDogs((prev) => [...prev, dog]);
  }, []);

  const handleDogDeleted = useCallback((id: string) => {
    setDogs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleDogUpdated = useCallback((dog: DogProfile) => {
    setDogs((prev) => prev.map((d) => (d.id === dog.id ? dog : d)));
  }, []);

  const handleExitTracking = useCallback(() => {
    setFocusDogId(null);
  }, []);

  const handlePackReady = useCallback(
    (_pack: Pack) => {
      setNeedsPack(false);
      // Reload data
      api.listDogs().then(setDogs).catch(() => {});
      api.listGeofences().then(setGeofences).catch(() => {});
    },
    [api],
  );

  // Geofence drawing callbacks
  const handleStartDraw = useCallback(() => {
    setEditingGeofenceId(null);
    setDrawingMode(true);
  }, []);

  const handlePolygonComplete = useCallback((vertices: Coordinate[]) => {
    setDrawingMode(false);
    setPendingVertices(vertices);
  }, []);

  const handleGeofenceSaved = useCallback((gf: Geofence) => {
    setGeofences((prev) => [...prev, gf]);
    setPendingVertices(null);
  }, []);

  const handleEditGeofence = useCallback((id: string) => {
    setDrawingMode(false);
    setEditingGeofenceId(id);
  }, []);

  const handlePolygonUpdated = useCallback(
    async (id: string, vertices: Coordinate[]) => {
      try {
        const updated = await api.updateGeofence(id, { vertices });
        setGeofences((prev) => prev.map((g) => (g.id === id ? updated : g)));
      } catch {
        // ignore
      }
      setEditingGeofenceId(null);
    },
    [api],
  );

  const handleDeleteGeofence = useCallback(
    async (id: string) => {
      try {
        await api.deleteGeofence(id);
        setGeofences((prev) => prev.filter((g) => g.id !== id));
      } catch {
        // ignore
      }
    },
    [api],
  );

  const handleToggleEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        const updated = await api.updateGeofence(id, { enabled });
        setGeofences((prev) => prev.map((g) => (g.id === id ? updated : g)));
      } catch {
        // ignore
      }
    },
    [api],
  );

  const handleDrawCancel = useCallback(() => {
    setDrawingMode(false);
    setEditingGeofenceId(null);
  }, []);

  if (!ready) return null;

  return (
    <div className="flex h-screen">
      <Sidebar>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Leashline</h1>
          <button
            onClick={() => setShowPackSettings(true)}
            className="text-gray-400 hover:text-gray-600 text-sm"
            title="Pack settings"
          >
            &#9881;
          </button>
        </div>
        <ConnectionStatus
          state={connectionState}
          onSwitch={() => setShowSwitcher(true)}
        />
        <NotificationToggle api={api} />
        <DogList
          dogs={dogs}
          positions={positions}
          geofences={geofences}
          dogZones={dogZones}
          onDogAdded={handleDogAdded}
          onDogDeleted={handleDogDeleted}
          onDogUpdated={handleDogUpdated}
        />
        <GeofenceList
          geofences={geofences}
          onStartDraw={handleStartDraw}
          onEditGeofence={handleEditGeofence}
          onDeleteGeofence={handleDeleteGeofence}
          onToggleEnabled={handleToggleEnabled}
        />
        <AlertList alerts={alerts} />
      </Sidebar>

      <div className="flex-1 relative">
        <Map
          positions={positions}
          geofences={geofences}
          focusDogId={focusDogId}
          dogNames={dogNames}
          drawingMode={drawingMode}
          editingGeofenceId={editingGeofenceId}
          onPolygonComplete={handlePolygonComplete}
          onPolygonUpdated={handlePolygonUpdated}
          onDrawCancel={handleDrawCancel}
        />
        {focusDogId && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-red-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3">
              <span className="animate-pulse font-semibold">
                Tracking escape
              </span>
              <button
                onClick={handleExitTracking}
                className="text-xs bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded"
              >
                Exit
              </button>
            </div>
          </div>
        )}
        {(drawingMode || editingGeofenceId) && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-white text-gray-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 border border-gray-200">
              <span className="text-sm">
                {drawingMode
                  ? "Click to add points. Double-click to finish."
                  : "Drag vertices to edit. Press Escape when done."}
              </span>
              <button
                onClick={handleDrawCancel}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {showSwitcher && (
        <ConnectionSwitcher onClose={() => setShowSwitcher(false)} />
      )}

      {showPackSettings && (
        <PackSettings api={api} onClose={() => setShowPackSettings(false)} />
      )}

      {needsPack && <PackSetup api={api} onPackReady={handlePackReady} />}

      {pendingVertices && (
        <CreateGeofenceModal
          vertices={pendingVertices}
          onClose={() => setPendingVertices(null)}
          onGeofenceSaved={handleGeofenceSaved}
        />
      )}
    </div>
  );
}
