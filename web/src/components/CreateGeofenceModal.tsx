"use client";

import { useState } from "react";
import { useApi } from "@/lib/api-provider";
import type { Coordinate, Geofence } from "@/lib/types";

interface CreateGeofenceModalProps {
  vertices: Coordinate[];
  onClose: () => void;
  onGeofenceSaved: (gf: Geofence) => void;
}

export default function CreateGeofenceModal({
  vertices,
  onClose,
  onGeofenceSaved,
}: CreateGeofenceModalProps) {
  const api = useApi();
  const [name, setName] = useState("");
  const [bufferMeters, setBufferMeters] = useState("0");
  const [zoneType, setZoneType] = useState<"safe" | "label">("safe");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const gf = await api.createGeofence({
        name: name.trim(),
        vertices,
        buffer_meters: parseFloat(bufferMeters) || 0,
        zone_type: zoneType,
      });
      onGeofenceSaved(gf);
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
          <h3 className="text-lg font-semibold">New Geofence</h3>
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
              placeholder="e.g. Backyard"
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Buffer distance (meters)
            </label>
            <input
              type="number"
              min="0"
              value={bufferMeters}
              onChange={(e) => setBufferMeters(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Extra margin before alerting. 0 = alert at boundary.
            </p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Zone type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="zone_type"
                  value="safe"
                  checked={zoneType === "safe"}
                  onChange={() => setZoneType("safe")}
                  className="accent-blue-600"
                />
                <span>Safe zone</span>
                <span className="text-xs text-gray-400">(alerts)</span>
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="zone_type"
                  value="label"
                  checked={zoneType === "label"}
                  onChange={() => setZoneType("label")}
                  className="accent-blue-600"
                />
                <span>Label</span>
                <span className="text-xs text-gray-400">(location only)</span>
              </label>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            {vertices.length} vertices drawn
          </p>
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
