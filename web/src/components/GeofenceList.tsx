"use client";

import type { Geofence } from "@/lib/types";

export const GEOFENCE_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#a855f7", // purple
  "#ec4899", // pink
];

export function geofenceColor(index: number): string {
  return GEOFENCE_COLORS[index % GEOFENCE_COLORS.length];
}

interface GeofenceListProps {
  geofences: Geofence[];
  onStartDraw: () => void;
  onEditGeofence: (id: string) => void;
  onDeleteGeofence: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
}

export default function GeofenceList({
  geofences,
  onStartDraw,
  onEditGeofence,
  onDeleteGeofence,
  onToggleEnabled,
}: GeofenceListProps) {
  return (
    <section className="p-4 border-b border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Geofences
        </h2>
        <button
          onClick={onStartDraw}
          className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded text-lg leading-none"
          title="Draw new geofence"
        >
          +
        </button>
      </div>
      {geofences.length === 0 && (
        <p className="text-sm text-gray-400">No geofences defined</p>
      )}
      <ul className="space-y-2">
        {geofences.map((gf, i) => (
          <li
            key={gf.id}
            className="flex items-center justify-between text-sm group"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: geofenceColor(i) }}
              />
              <span
                className={`font-medium truncate ${gf.enabled ? "text-gray-800" : "text-gray-400 line-through"}`}
              >
                {gf.name}
              </span>
              {gf.zone_type === "label" && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">label</span>
              )}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onToggleEnabled(gf.id, !gf.enabled)}
                className={`text-xs px-1.5 py-0.5 rounded ${gf.enabled ? "text-green-600 bg-green-50" : "text-gray-400 bg-gray-100"}`}
                title={gf.enabled ? "Disable" : "Enable"}
              >
                {gf.enabled ? "on" : "off"}
              </button>
              <button
                onClick={() => onEditGeofence(gf.id)}
                className="text-gray-300 hover:text-blue-500 text-xs sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                title="Edit vertices"
              >
                &#9998;
              </button>
              <button
                onClick={() => onDeleteGeofence(gf.id)}
                className="text-gray-300 hover:text-red-500 text-xs leading-none sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                title="Delete"
              >
                &times;
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
