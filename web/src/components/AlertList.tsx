"use client";

import { acknowledgeAlert } from "@/lib/api";
import type { Alert } from "@/lib/types";

interface AlertListProps {
  alerts: Alert[];
}

const levelColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-yellow-100 text-yellow-800",
  breach: "bg-orange-100 text-orange-800",
  escape: "bg-red-100 text-red-800",
};

export default function AlertList({ alerts }: AlertListProps) {
  const handleAck = async (id: string) => {
    try {
      await acknowledgeAlert(id);
    } catch {
      // ignore errors silently
    }
  };

  return (
    <section className="p-4 border-b border-gray-200 flex-1 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Alerts
      </h2>
      {alerts.length === 0 && (
        <p className="text-sm text-gray-400">No alerts</p>
      )}
      <ul className="space-y-2">
        {alerts.slice(0, 50).map((a) => (
          <li key={a.id} className="text-sm">
            <div className="flex items-center gap-2">
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-medium ${levelColors[a.level] ?? "bg-gray-100 text-gray-800"}`}
              >
                {a.level}
              </span>
              <span className="text-gray-700 flex-1 truncate">{a.message}</span>
            </div>
            {!a.acknowledged && (
              <button
                onClick={() => handleAck(a.id)}
                className="text-xs text-blue-600 hover:underline mt-0.5"
              >
                Acknowledge
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
