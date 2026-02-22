"use client";

import { useState } from "react";
import { useApi } from "@/lib/api-provider";
import type { DogProfile, Geofence } from "@/lib/types";

interface ZoneSettingsModalProps {
  geofence: Geofence;
  dogs: DogProfile[];
  onClose: () => void;
  onUpdated: (gf: Geofence) => void;
  onDeleted: (id: string) => void;
  onEditVertices: (id: string) => void;
}

export default function ZoneSettingsModal({
  geofence,
  dogs,
  onClose,
  onUpdated,
  onDeleted,
  onEditVertices,
}: ZoneSettingsModalProps) {
  const api = useApi();
  const [name, setName] = useState(geofence.name);
  const [zoneType, setZoneType] = useState(geofence.zone_type);
  const [enabled, setEnabled] = useState(geofence.enabled);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignedDogs = dogs.filter((d) => d.geofence_ids.includes(geofence.id));
  const dirty =
    name !== geofence.name ||
    zoneType !== geofence.zone_type ||
    enabled !== geofence.enabled;

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateGeofence(geofence.id, {
        name: name.trim(),
        zone_type: zoneType,
        enabled,
      });
      onUpdated(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.deleteGeofence(geofence.id);
      onDeleted(geofence.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{geofence.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setZoneType("safe")}
                className={`flex-1 text-xs py-1.5 rounded border ${
                  zoneType === "safe"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                Alert zone
              </button>
              <button
                onClick={() => setZoneType("label")}
                className={`flex-1 text-xs py-1.5 rounded border ${
                  zoneType === "label"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                Label only
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-500">Enabled</label>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`text-xs px-2.5 py-1 rounded ${
                enabled
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {enabled ? "On" : "Off"}
            </button>
          </div>

          <div>
            <button
              onClick={() => {
                onEditVertices(geofence.id);
                onClose();
              }}
              className="w-full text-xs text-blue-600 hover:text-blue-800 py-1.5 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
            >
              Edit boundary on map
            </button>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Dogs ({assignedDogs.length})
            </label>
            {assignedDogs.length === 0 ? (
              <p className="text-xs text-gray-400">
                No dogs assigned to this zone
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {assignedDogs.map((dog) => (
                  <span
                    key={dog.id}
                    className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded"
                  >
                    {dog.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <div className="flex items-center justify-between">
          <div>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Delete zone
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Are you sure?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !dirty}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
