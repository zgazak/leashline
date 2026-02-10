"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useApi } from "@/lib/api-provider";
import type { DogProfile, Geofence, Pack } from "@/lib/types";
import { useAlerts } from "@/hooks/useAlerts";
import { useConnection } from "@/hooks/useConnection";
import { usePositions } from "@/hooks/usePositions";
import AlertList from "@/components/AlertList";
import ConnectionStatus from "@/components/ConnectionStatus";
import ConnectionSwitcher from "@/components/ConnectionSwitcher";
import DogList from "@/components/DogList";
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
        <DogList
          dogs={dogs}
          positions={positions}
          onDogAdded={handleDogAdded}
          onDogDeleted={handleDogDeleted}
        />
        <AlertList alerts={alerts} />
      </Sidebar>

      <div className="flex-1 relative">
        <Map
          positions={positions}
          geofences={geofences}
          focusDogId={focusDogId}
          dogNames={dogNames}
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
      </div>

      {showSwitcher && (
        <ConnectionSwitcher onClose={() => setShowSwitcher(false)} />
      )}

      {showPackSettings && (
        <PackSettings api={api} onClose={() => setShowPackSettings(false)} />
      )}

      {needsPack && <PackSetup api={api} onPackReady={handlePackReady} />}
    </div>
  );
}
