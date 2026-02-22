"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/lib/api-provider";
import type { DogProfile } from "@/lib/types";

interface NearbyDevice {
  device_id: string;
  last_seen: string;
  lat: number;
  lon: number;
  rssi: number | null;
  snr: number | null;
}

interface AddDogModalProps {
  onClose: () => void;
  onDogAdded: (dog: DogProfile) => void;
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

export default function AddDogModal({ onClose, onDogAdded }: AddDogModalProps) {
  const api = useApi();
  const [name, setName] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nearbyDevices, setNearbyDevices] = useState<NearbyDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);

  useEffect(() => {
    api
      .getNearbyDevices()
      .then(setNearbyDevices)
      .catch(() => {})
      .finally(() => setLoadingDevices(false));
  }, [api]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const dog = await api.createDog({
        name: name.trim(),
        device_id: deviceId.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onDogAdded(dog);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Dog</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Buddy"
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Collar Device
            </label>
            {nearbyDevices.length > 0 ? (
              <div className="space-y-1.5">
                {nearbyDevices.map((d) => (
                  <button
                    key={d.device_id}
                    type="button"
                    onClick={() =>
                      setDeviceId(
                        deviceId === d.device_id ? "" : d.device_id,
                      )
                    }
                    className={`w-full text-left px-2 py-1.5 rounded border text-sm flex items-center justify-between ${
                      deviceId === d.device_id
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    <span className="font-mono text-xs">{d.device_id}</span>
                    <span className="text-xs text-gray-400">
                      {timeAgo(d.last_seen)}
                      {d.rssi != null && ` / ${d.rssi} dBm`}
                    </span>
                  </button>
                ))}
              </div>
            ) : loadingDevices ? (
              <p className="text-xs text-gray-400">Scanning...</p>
            ) : (
              <p className="text-xs text-gray-400 mb-1">
                No devices heard recently
              </p>
            )}
            <input
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="Or type hex ID manually (e.g. !aabbccdd)"
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1.5"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Breed, weight, etc. (optional)"
              rows={2}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm resize-none"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
