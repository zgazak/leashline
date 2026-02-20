"use client";

import { useEffect, useState } from "react";
import type { DogProfile, TrackPoint } from "@/lib/types";

interface LiveTabProps {
  dogs: DogProfile[];
  positions: Record<string, TrackPoint>;
  dogZones: Record<string, string>;
  onFocusDog: (deviceId: string) => void;
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
  dogZones,
  onFocusDog,
}: LiveTabProps) {
  const [, setTick] = useState(0);

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

  return (
    <div className="p-2 space-y-1">
      {dogs.map((dog) => {
        const tp = dog.device_id ? positions[dog.device_id] : undefined;
        const zone = dogZones[dog.id];
        return (
          <button
            key={dog.id}
            onClick={() => dog.device_id && onFocusDog(dog.device_id)}
            disabled={!dog.device_id}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
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
            <span className="text-xs text-gray-400 shrink-0">
              {tp ? timeAgo(tp.received_at) : "no signal"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
