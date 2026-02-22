"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useApi } from "@/lib/api-provider";
import type { Coordinate, DogProfile, Geofence, NoiseProfile, Pack } from "@/lib/types";
import { pointInPolygon } from "@/lib/geo";
import { useAlerts } from "@/hooks/useAlerts";
import { useConnection } from "@/hooks/useConnection";
import { usePositions } from "@/hooks/usePositions";
import { usePositionTrails } from "@/hooks/usePositionTrails";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useBottomSheet } from "@/hooks/useBottomSheet";
import AlertChips from "@/components/AlertChips";
import BottomSheet, { type TabId } from "@/components/BottomSheet";
import ConnectionSwitcher from "@/components/ConnectionSwitcher";
import CreateGeofenceModal from "@/components/CreateGeofenceModal";
import DogList from "@/components/DogList";
import GeofenceList from "@/components/GeofenceList";
import LiveTab from "@/components/LiveTab";
import PackSetup from "@/components/PackSetup";
import PackSettings from "@/components/PackSettings";
import SettingsTab from "@/components/SettingsTab";

// Load Map client-only (mapbox-gl needs window)
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function DashboardPage() {
  const api = useApi();

  const [dogs, setDogs] = useState<DogProfile[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showPackSettings, setShowPackSettings] = useState(false);
  const [focusDogId, setFocusDogId] = useState<string | null>(null);
  const [isEscapeTracking, setIsEscapeTracking] = useState(false);
  const [needsPack, setNeedsPack] = useState(false);
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("live");

  // Geofence drawing state
  const [drawingMode, setDrawingMode] = useState(false);
  const [editingGeofenceId, setEditingGeofenceId] = useState<string | null>(
    null,
  );
  const [pendingVertices, setPendingVertices] = useState<Coordinate[] | null>(
    null,
  );

  const positions = usePositions(api);
  const trails = usePositionTrails(api, positions);
  const telemetry = useTelemetry(api);
  const alerts = useAlerts(api);
  const connectionState = useConnection(api);
  const [noiseProfiles, setNoiseProfiles] = useState<Record<string, NoiseProfile>>({});
  const { snapPoint, setSnapPoint, sheetRef, handleProps, getHeight } =
    useBottomSheet("collapsed");

  // Track which escape alerts the user has dismissed (so auto-detection doesn't re-trigger)
  const dismissedEscapeIds = useRef<Set<string>>(new Set());

  // Track bottom sheet height for alert chips positioning
  const [sheetHeight, setSheetHeight] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;

    const observe = () => {
      const update = () => {
        if (el) setSheetHeight(el.getBoundingClientRect().height);
        rafRef.current = requestAnimationFrame(update);
      };
      rafRef.current = requestAnimationFrame(update);
    };
    observe();
    return () => cancelAnimationFrame(rafRef.current);
  }, [sheetRef]);

  // Poll noise profiles every 30s
  useEffect(() => {
    let active = true;
    const poll = () => {
      api.getNoiseProfiles().then((data) => {
        if (active) setNoiseProfiles(data);
      }).catch(() => {});
    };
    poll();
    const id = setInterval(poll, 30_000);
    return () => { active = false; clearInterval(id); };
  }, [api]);

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

  // Auto-detect escape alerts → enter tracking mode + collapse sheet
  useEffect(() => {
    const escape = alerts.find(
      (a) => a.level === "escape" && !a.acknowledged && !dismissedEscapeIds.current.has(a.id),
    );
    if (escape && focusDogId !== escape.dog_id) {
      setFocusDogId(escape.dog_id);
      setIsEscapeTracking(true);
      setSnapPoint("collapsed");
    }
  }, [alerts, focusDogId, setSnapPoint]);

  const handleMapInteraction = useCallback(() => {
    setSnapPoint("collapsed");
  }, [setSnapPoint]);

  const handleFocusDog = useCallback(
    (deviceId: string) => {
      // Find the dog by device_id, then set focusDogId to the dog's id
      const dog = dogs.find((d) => d.device_id === deviceId);
      if (dog) {
        setFocusDogId(dog.id);
        setIsEscapeTracking(false);
        setSnapPoint("collapsed");
      }
    },
    [dogs, setSnapPoint],
  );

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
    // Mark current escape alerts as dismissed so auto-detection doesn't re-trigger
    for (const a of alerts) {
      if (a.level === "escape" && !a.acknowledged) {
        dismissedEscapeIds.current.add(a.id);
      }
    }
    setFocusDogId(null);
    setIsEscapeTracking(false);
  }, [alerts]);

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

  const handleDrawCancel = useCallback(() => {
    setDrawingMode(false);
    setEditingGeofenceId(null);
  }, []);

  if (!ready) return null;

  return (
    <div className="relative h-[100dvh] overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <Map
          positions={positions}
          trails={trails}
          noiseProfiles={noiseProfiles}
          telemetry={telemetry}
          geofences={geofences}
          focusDogId={focusDogId}
          dogNames={dogNames}
          drawingMode={drawingMode}
          editingGeofenceId={editingGeofenceId}
          onPolygonComplete={handlePolygonComplete}
          onPolygonUpdated={handlePolygonUpdated}
          onDrawCancel={handleDrawCancel}
          onMapInteraction={handleMapInteraction}
          bottomPadding={sheetHeight}
        />
      </div>

      {/* Escape tracking banner */}
      {isEscapeTracking && focusDogId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10" style={{ top: "env(safe-area-inset-top, 16px)" }}>
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

      {/* Draw instructions overlay */}
      {(drawingMode || editingGeofenceId) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10" style={{ top: "env(safe-area-inset-top, 16px)" }}>
          <div className="bg-white text-gray-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 border border-gray-200">
            <span className="text-sm">
              {drawingMode
                ? "Tap to add points. Double-tap to finish."
                : "Drag vertices to edit. Tap done when finished."}
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

      {/* Alert chips above bottom sheet */}
      <AlertChips alerts={alerts} bottomOffset={sheetHeight} />

      {/* Bottom sheet */}
      <BottomSheet
        sheetRef={sheetRef}
        handleProps={handleProps}
        snapPoint={snapPoint}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {activeTab === "live" && (
          <LiveTab
            dogs={dogs}
            positions={positions}
            telemetry={telemetry}
            dogZones={dogZones}
            onFocusDog={handleFocusDog}
          />
        )}
        {activeTab === "dogs" && (
          <DogList
            dogs={dogs}
            positions={positions}
            telemetry={telemetry}
            geofences={geofences}
            dogZones={dogZones}
            onFocusDog={handleFocusDog}
            onDogAdded={handleDogAdded}
            onDogDeleted={handleDogDeleted}
            onDogUpdated={handleDogUpdated}
          />
        )}
        {activeTab === "zones" && (
          <GeofenceList
            geofences={geofences}
            dogs={dogs}
            onStartDraw={handleStartDraw}
            onEditGeofence={handleEditGeofence}
            onDeleteGeofence={handleDeleteGeofence}
            onGeofenceUpdated={(gf) =>
              setGeofences((prev) => prev.map((g) => (g.id === gf.id ? gf : g)))
            }
          />
        )}
        {activeTab === "settings" && (
          <SettingsTab
            connectionState={connectionState}
            onSwitchConnection={() => setShowSwitcher(true)}
            api={api}
            onOpenPackSettings={() => setShowPackSettings(true)}
          />
        )}
      </BottomSheet>

      {/* Modals */}
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
