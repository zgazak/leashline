"use client";

import { useState, useEffect } from "react";
import type { DeviceTelemetry, DogProfile, Geofence, TrackPoint } from "@/lib/types";
import AddDogModal from "@/components/AddDogModal";
import DogGeofenceAssign from "@/components/DogGeofenceAssign";
import DogSettingsModal from "@/components/DogSettingsModal";

interface DogListProps {
  dogs: DogProfile[];
  positions: Record<string, TrackPoint>;
  telemetry: Record<string, DeviceTelemetry>;
  geofences: Geofence[];
  dogZones: Record<string, string>;
  onFocusDog: (deviceId: string) => void;
  onDogAdded: (dog: DogProfile) => void;
  onDogDeleted: (id: string) => void;
  onDogUpdated: (dog: DogProfile) => void;
}

function batteryColor(level: number): string {
  if (level > 50) return "text-green-500";
  if (level > 20) return "text-yellow-500";
  return "text-red-500";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export default function DogList({
  dogs,
  positions,
  telemetry,
  geofences,
  dogZones,
  onFocusDog,
  onDogAdded,
  onDogDeleted,
  onDogUpdated,
}: DogListProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [settingsDogId, setSettingsDogId] = useState<string | null>(null);
  const [assignDogId, setAssignDogId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const settingsDog = dogs.find((d) => d.id === settingsDogId);

  return (
    <>
      <section className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Dogs
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded text-lg leading-none"
            title="Add dog"
          >
            +
          </button>
        </div>
        {dogs.length === 0 && (
          <p className="text-sm text-gray-400">No dogs registered</p>
        )}
        <ul className="space-y-2">
          {dogs.map((dog) => {
            const tp = dog.device_id ? positions[dog.device_id] : undefined;
            const telem = dog.device_id ? telemetry[dog.device_id] : undefined;
            return (
              <li
                key={dog.id}
                className="flex items-center justify-between text-sm group relative"
              >
                <button
                  className="min-w-0 text-left"
                  onClick={() => dog.device_id && onFocusDog(dog.device_id)}
                >
                  <span className="font-medium text-gray-800 block">{dog.name}</span>
                  {dogZones[dog.id] && (
                    <span className="text-xs text-gray-400 block truncate">at {dogZones[dog.id]}</span>
                  )}
                </button>
                <span className="flex items-center gap-2">
                  {telem?.battery_level != null && (
                    <span className={`text-xs font-medium ${batteryColor(telem.battery_level)}`}>
                      {telem.battery_level}%
                    </span>
                  )}
                  <span className="text-gray-400 text-xs">
                    {tp ? timeAgo(tp.received_at) : "no signal"}
                  </span>
                  <button
                    onClick={() =>
                      setAssignDogId(assignDogId === dog.id ? null : dog.id)
                    }
                    className="text-gray-300 hover:text-blue-500 text-xs leading-none sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    title="Assign geofences"
                  >
                    &#9638;
                  </button>
                  <button
                    onClick={() => setSettingsDogId(dog.id)}
                    className="text-gray-300 hover:text-gray-500 leading-none sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    title="Dog settings"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  </button>
                </span>
                {assignDogId === dog.id && (
                  <DogGeofenceAssign
                    dog={dog}
                    geofences={geofences}
                    onClose={() => setAssignDogId(null)}
                    onDogUpdated={onDogUpdated}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {showAddModal && (
        <AddDogModal
          onClose={() => setShowAddModal(false)}
          onDogAdded={onDogAdded}
        />
      )}

      {settingsDog && (
        <DogSettingsModal
          dog={settingsDog}
          geofences={geofences}
          onClose={() => setSettingsDogId(null)}
          onDogUpdated={onDogUpdated}
          onDogDeleted={onDogDeleted}
        />
      )}
    </>
  );
}
