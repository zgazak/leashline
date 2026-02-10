"use client";

import type { ConnectionState } from "@/lib/types";

interface ConnectionStatusProps {
  state: ConnectionState;
  onSwitch: () => void;
}

const statusDot: Record<string, string> = {
  connected: "bg-green-500",
  connecting: "bg-yellow-400 animate-pulse",
  disconnected: "bg-gray-400",
  error: "bg-red-500",
  scanning: "bg-blue-400 animate-pulse",
};

const statusLabel: Record<string, string> = {
  connected: "Connected",
  connecting: "Connecting...",
  disconnected: "Disconnected",
  error: "Error",
  scanning: "Scanning...",
};

export default function ConnectionStatus({
  state,
  onSwitch,
}: ConnectionStatusProps) {
  return (
    <section className="p-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${statusDot[state.status] ?? "bg-gray-400"}`}
          />
          <span className="text-sm font-medium text-gray-700">
            {statusLabel[state.status] ?? state.status}
          </span>
          {state.connection_type && (
            <span className="text-xs text-gray-400">
              ({state.connection_type})
            </span>
          )}
        </div>
        <button
          onClick={onSwitch}
          className="text-xs text-blue-600 hover:underline"
        >
          Switch
        </button>
      </div>
      {state.detail && (
        <p className="text-xs text-red-500 mt-1 truncate">{state.detail}</p>
      )}
    </section>
  );
}
