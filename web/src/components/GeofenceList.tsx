"use client";

import { useState } from "react";
import type { DogProfile, Geofence } from "@/lib/types";
import ZoneSettingsModal from "@/components/ZoneSettingsModal";

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
  dogs: DogProfile[];
  onStartDraw: () => void;
  onEditGeofence: (id: string) => void;
  onDeleteGeofence: (id: string) => void;
  onGeofenceUpdated: (gf: Geofence) => void;
}

export default function GeofenceList({
  geofences,
  dogs,
  onStartDraw,
  onEditGeofence,
  onDeleteGeofence,
  onGeofenceUpdated,
}: GeofenceListProps) {
  const [settingsGeofenceId, setSettingsGeofenceId] = useState<string | null>(null);

  const settingsGeofence = geofences.find((g) => g.id === settingsGeofenceId);

  return (
    <>
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
          {geofences.map((gf, i) => {
            const assignedDogs = dogs.filter((d) =>
              d.geofence_ids.includes(gf.id),
            );
            return (
              <li key={gf.id} className="text-sm group">
                <div className="flex items-center justify-between">
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
                      <span className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">
                        label
                      </span>
                    )}
                    {!gf.enabled && (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-400 shrink-0">
                        off
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => setSettingsGeofenceId(gf.id)}
                    className="text-gray-300 hover:text-gray-500 leading-none sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    title="Zone settings"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  </button>
                </div>
                {assignedDogs.length > 0 && (
                  <div className="ml-5 mt-0.5 flex flex-wrap gap-1">
                    {assignedDogs.map((dog) => (
                      <span
                        key={dog.id}
                        className="text-[10px] text-gray-400"
                      >
                        {dog.name}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {settingsGeofence && (
        <ZoneSettingsModal
          geofence={settingsGeofence}
          dogs={dogs}
          onClose={() => setSettingsGeofenceId(null)}
          onUpdated={onGeofenceUpdated}
          onDeleted={onDeleteGeofence}
          onEditVertices={onEditGeofence}
        />
      )}
    </>
  );
}
