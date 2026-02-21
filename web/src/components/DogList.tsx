"use client";

import { useState, useEffect } from "react";
import type { DogProfile, Geofence, TrackPoint } from "@/lib/types";
import AddDogModal from "@/components/AddDogModal";
import DogGeofenceAssign from "@/components/DogGeofenceAssign";
import DogSettingsModal from "@/components/DogSettingsModal";

interface DogListProps {
  dogs: DogProfile[];
  positions: Record<string, TrackPoint>;
  geofences: Geofence[];
  dogZones: Record<string, string>;
  onDogAdded: (dog: DogProfile) => void;
  onDogDeleted: (id: string) => void;
  onDogUpdated: (dog: DogProfile) => void;
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
  geofences,
  dogZones,
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
            return (
              <li
                key={dog.id}
                className="flex items-center justify-between text-sm group relative"
              >
                <span className="min-w-0">
                  <span className="font-medium text-gray-800 block">{dog.name}</span>
                  {dogZones[dog.id] && (
                    <span className="text-xs text-gray-400 block truncate">at {dogZones[dog.id]}</span>
                  )}
                </span>
                <span className="flex items-center gap-2">
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
                    className="text-gray-300 hover:text-gray-500 text-xs leading-none sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    title="Dog settings"
                  >
                    &#9881;
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
          onClose={() => setSettingsDogId(null)}
          onDogUpdated={onDogUpdated}
          onDogDeleted={onDogDeleted}
        />
      )}
    </>
  );
}
