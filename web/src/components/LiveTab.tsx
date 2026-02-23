"use client";

import { useEffect, useState } from "react";
import type { DeviceTelemetry, DogProfile, Geofence, TrackPoint } from "@/lib/types";
import AddDogModal from "@/components/AddDogModal";
import DogGeofenceAssign from "@/components/DogGeofenceAssign";
import DogSettingsModal from "@/components/DogSettingsModal";

interface LiveTabProps {
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

function statusColor(
  dog: DogProfile,
  tp: TrackPoint | undefined,
  zoneName: string | undefined,
): string {
  if (!tp) return "bg-gray-400"; // no signal
  if (zoneName) return "bg-green-500"; // in zone
  // Has position but not in any zone — could be escaped
  if (dog.geofence_ids.length > 0) return "bg-red-500";
  return "bg-blue-500"; // no geofences assigned
}

export default function LiveTab({
  dogs,
  positions,
  telemetry,
  geofences,
  dogZones,
  onFocusDog,
  onDogAdded,
  onDogDeleted,
  onDogUpdated,
}: LiveTabProps) {
  const [, setTick] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [settingsDogId, setSettingsDogId] = useState<string | null>(null);
  const [assignDogId, setAssignDogId] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const settingsDog = dogs.find((d) => d.id === settingsDogId);

  return (
    <div className="p-2 space-y-1">
      {/* Header with add button */}
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {dogs.length} {dogs.length === 1 ? "dog" : "dogs"}
        </span>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded text-lg leading-none"
          title="Add dog"
        >
          +
        </button>
      </div>

      {dogs.length === 0 && (
        <div className="p-4 text-sm text-gray-400">
          No dogs registered. Tap + to add one.
        </div>
      )}

      {dogs.map((dog) => {
        const tp = dog.device_id ? positions[dog.device_id] : undefined;
        const telem = dog.device_id ? telemetry[dog.device_id] : undefined;
        const zone = dogZones[dog.id];
        return (
          <div key={dog.id} className="relative">
            <div className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <button
                onClick={() => dog.device_id && onFocusDog(dog.device_id)}
                disabled={!dog.device_id}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColor(dog, tp, zone)}`}
                />
                <span className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 block text-sm">
                    {dog.name}
                  </span>
                  <span className="text-xs text-gray-400 block truncate">
                    {zone ? `at ${zone}` : dog.geofence_ids.length > 0 ? "outside zone" : "no zone assigned"}
                  </span>
                </span>
              </button>
              <span className="flex items-center gap-2 shrink-0">
                {telem?.battery_level != null && (
                  <span className={`text-xs font-medium ${batteryColor(telem.battery_level)}`}>
                    {telem.battery_level}%
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {tp ? timeAgo(tp.received_at) : "no signal"}
                </span>
                <button
                  onClick={() =>
                    setAssignDogId(assignDogId === dog.id ? null : dog.id)
                  }
                  className="text-gray-300 hover:text-blue-500 text-xs leading-none"
                  title="Assign geofences"
                >
                  &#9638;
                </button>
                <button
                  onClick={() => setSettingsDogId(dog.id)}
                  className="text-gray-300 hover:text-gray-500 leading-none"
                  title="Dog settings"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
              </span>
            </div>
            {assignDogId === dog.id && (
              <DogGeofenceAssign
                dog={dog}
                geofences={geofences}
                onClose={() => setAssignDogId(null)}
                onDogUpdated={onDogUpdated}
              />
            )}
          </div>
        );
      })}

      {showAddModal && (
        <AddDogModal
          onClose={() => setShowAddModal(false)}
          onDogAdded={onDogAdded}
        />
      )}

      {settingsDog && (
        <DogSettingsModal
          dog={settingsDog}
          onClose={() => setSettingsDogId(null)}
          onDogUpdated={onDogUpdated}
          onDogDeleted={onDogDeleted}
        />
      )}
    </div>
  );
}
