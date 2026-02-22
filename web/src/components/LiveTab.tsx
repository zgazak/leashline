"use client";

import { useEffect, useState } from "react";
import type { DeviceTelemetry, DogProfile, TrackPoint } from "@/lib/types";
import DogInfoModal from "./DogInfoModal";

interface LiveTabProps {
  dogs: DogProfile[];
  positions: Record<string, TrackPoint>;
  telemetry: Record<string, DeviceTelemetry>;
  dogZones: Record<string, string>;
  onFocusDog: (deviceId: string) => void;
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
  dogZones,
  onFocusDog,
}: LiveTabProps) {
  const [, setTick] = useState(0);
  const [infoDogId, setInfoDogId] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (dogs.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-400">
        No dogs registered. Add one in the Dogs tab.
      </div>
    );
  }

  const infoDog = infoDogId ? dogs.find((d) => d.id === infoDogId) : undefined;

  return (
    <div className="p-2 space-y-1">
      {dogs.map((dog) => {
        const tp = dog.device_id ? positions[dog.device_id] : undefined;
        const telem = dog.device_id ? telemetry[dog.device_id] : undefined;
        const zone = dogZones[dog.id];
        return (
          <div
            key={dog.id}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
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
                onClick={() => setInfoDogId(dog.id)}
                className="w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors text-xs font-serif"
                title="Dog info"
              >
                i
              </button>
            </span>
          </div>
        );
      })}

      {infoDog && (
        <DogInfoModal
          dog={infoDog}
          position={infoDog.device_id ? positions[infoDog.device_id] : undefined}
          telemetry={infoDog.device_id ? telemetry[infoDog.device_id] : undefined}
          zoneName={dogZones[infoDog.id]}
          onClose={() => setInfoDogId(null)}
        />
      )}
    </div>
  );
}
