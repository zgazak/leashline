"use client";

import { useEffect, useState } from "react";
import type { DetectionStatus, DeviceTelemetry, DogProfile, Geofence, TrackPoint } from "@/lib/types";
import { assessFixQuality } from "@/lib/gps-quality";
import AddDogModal from "@/components/AddDogModal";
import DogInfoModal from "@/components/DogInfoModal";
import DogSettingsModal from "@/components/DogSettingsModal";

interface LiveTabProps {
  dogs: DogProfile[];
  positions: Record<string, TrackPoint>;
  telemetry: Record<string, DeviceTelemetry>;
  detectionStatus: Record<string, DetectionStatus>;
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
  if (dog.geofence_ids.length > 0) return "bg-red-500"; // outside assigned zone
  return "bg-blue-500"; // no geofences assigned
}

export default function LiveTab({
  dogs,
  positions,
  telemetry,
  detectionStatus,
  geofences,
  dogZones,
  onFocusDog,
  onDogAdded,
  onDogDeleted,
  onDogUpdated,
}: LiveTabProps) {
  const [, setTick] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [infoDogId, setInfoDogId] = useState<string | null>(null);
  const [settingsDogId, setSettingsDogId] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const infoDog = infoDogId ? dogs.find((d) => d.id === infoDogId) : undefined;
  const settingsDog = settingsDogId ? dogs.find((d) => d.id === settingsDogId) : undefined;

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
        const ds = detectionStatus[dog.id];
        const isFiltering = (() => {
          if (!ds?.last_filtered_at || !tp) return false;
          const filteredAge = Date.now() - new Date(ds.last_filtered_at).getTime();
          const posAge = Date.now() - new Date(tp.received_at).getTime();
          return filteredAge < 60_000 && filteredAge < posAge;
        })();
        return (
          <div
            key={dog.id}
            className="flex items-center rounded-lg hover:bg-gray-50 transition-colors"
          >
            {/* Left half: focus on map */}
            <button
              onClick={() => dog.device_id && onFocusDog(dog.device_id)}
              disabled={!dog.device_id}
              className="flex items-center gap-3 flex-1 min-w-0 text-left p-3"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColor(dog, tp, zone)}`}
              />
              <span className="flex-1 min-w-0">
                <span className="font-medium text-gray-900 block text-sm">
                  {dog.name}
                </span>
                <span className="text-xs text-gray-400 block truncate">
                  {zone
                    ? `at ${zone}`
                    : dog.geofence_ids.length > 0
                      ? "outside zone"
                      : "no zone assigned"}
                  {tp ? ` \u00B7 ${timeAgo(tp.received_at)}` : " \u00B7 no signal"}
                </span>
              </span>
            </button>

            {/* Info zone: battery + signal summary, opens info modal */}
            <button
              onClick={() => setInfoDogId(dog.id)}
              className="flex items-center justify-center gap-1.5 px-3 py-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors shrink-0"
              title="Dog info"
            >
              {telem?.battery_level != null && (
                <span className={`text-xs font-medium ${batteryColor(telem.battery_level)}`}>
                  {telem.battery_level}%
                </span>
              )}
              {isFiltering && (
                <span
                  className="w-2 h-2 rounded-full shrink-0 bg-yellow-400"
                  title="Filtering poor positions"
                />
              )}
              {(() => {
                if (!tp || isFiltering) return null;
                const qi = assessFixQuality(tp);
                if (qi.quality === "good" || qi.quality === "unknown") return null;
                return (
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${qi.dotColor}`}
                    title={`${qi.label} \u00B7 ${qi.detail}`}
                  />
                );
              })()}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-40"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </button>

            {/* Settings zone: gear icon */}
            <button
              onClick={() => setSettingsDogId(dog.id)}
              className="flex items-center justify-center w-10 py-3 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded transition-colors shrink-0"
              title="Dog settings"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
          </div>
        );
      })}

      {showAddModal && (
        <AddDogModal
          onClose={() => setShowAddModal(false)}
          onDogAdded={onDogAdded}
        />
      )}

      {infoDog && (
        <DogInfoModal
          dog={infoDog}
          position={infoDog.device_id ? positions[infoDog.device_id] : undefined}
          telemetry={infoDog.device_id ? telemetry[infoDog.device_id] : undefined}
          zoneName={dogZones[infoDog.id]}
          detectionStatus={detectionStatus[infoDog.id]}
          onClose={() => setInfoDogId(null)}
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
    </div>
  );
}
