"use client";

import { useState } from "react";
import type { Api } from "@/lib/auth-api";
import type { Pack } from "@/lib/types";

interface PackSetupProps {
  api: Api;
  onPackReady: (pack: Pack) => void;
}

export default function PackSetup({ api, onPackReady }: PackSetupProps) {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdPack, setCreatedPack] = useState<Pack | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const pack = await api.createPack(name.trim());
      setCreatedPack(pack);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create pack");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const pack = await api.joinPack(code.trim());
      onPackReady(pack);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to join pack");
    } finally {
      setLoading(false);
    }
  };

  if (createdPack) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Pack Created!</h2>
          <p className="text-gray-600">
            Your pack <strong>{createdPack.name}</strong> is ready.
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">MQTT Topic Prefix</p>
            <code className="text-sm font-mono text-blue-700 break-all">
              {createdPack.mqtt_topic_prefix}/2/json/LongFast
            </code>
            <p className="text-xs text-gray-400 mt-2">
              Configure this in your Meshtastic app&apos;s MQTT settings.
            </p>
          </div>
          <button
            onClick={() => onPackReady(createdPack)}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Welcome to Leashline</h2>
        <p className="text-gray-600">
          Create a pack for your household, or join one with an invite code.
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        {mode === "choose" && (
          <div className="space-y-3">
            <button
              onClick={() => setMode("create")}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
            >
              Create a Pack
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200"
            >
              Join with Invite Code
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Pack name (e.g. The Smiths)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setMode("choose")}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !name.trim()}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        )}

        {mode === "join" && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Invite code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setMode("choose")}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200"
              >
                Back
              </button>
              <button
                onClick={handleJoin}
                disabled={loading || !code.trim()}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Joining..." : "Join"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
