"use client";

import { useState } from "react";
import { useApi } from "@/lib/api-provider";
import type { DogProfile, Geofence } from "@/lib/types";

interface DogGeofenceAssignProps {
  dog: DogProfile;
  geofences: Geofence[];
  onClose: () => void;
  onDogUpdated: (dog: DogProfile) => void;
}

export default function DogGeofenceAssign({
  dog,
  geofences,
  onClose,
  onDogUpdated,
}: DogGeofenceAssignProps) {
  const api = useApi();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(dog.geofence_ids),
  );
  const [saving, setSaving] = useState(false);

  const toggle = async (gfId: string) => {
    const next = new Set(selected);
    if (next.has(gfId)) {
      next.delete(gfId);
    } else {
      next.add(gfId);
    }
    setSelected(next);
    setSaving(true);
    try {
      const updated = await api.updateDog(dog.id, {
        geofence_ids: Array.from(next),
      });
      onDogUpdated(updated);
    } catch {
      // revert on error
      setSelected(selected);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-52">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase">
          Assign Geofences
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-sm leading-none"
        >
          &times;
        </button>
      </div>
      {geofences.length === 0 && (
        <p className="text-xs text-gray-400">No geofences to assign</p>
      )}
      <ul className="space-y-1">
        {geofences.map((gf) => (
          <li key={gf.id}>
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
              <input
                type="checkbox"
                checked={selected.has(gf.id)}
                onChange={() => toggle(gf.id)}
                disabled={saving}
                className="rounded border-gray-300"
              />
              <span className="text-gray-700 truncate">{gf.name}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
