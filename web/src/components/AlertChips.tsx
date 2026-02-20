"use client";

import { acknowledgeAlert } from "@/lib/api";
import type { Alert } from "@/lib/types";

interface AlertChipsProps {
  alerts: Alert[];
  bottomOffset: number;
}

const levelColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 border-blue-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  breach: "bg-orange-100 text-orange-800 border-orange-200",
  escape: "bg-red-100 text-red-800 border-red-200",
};

export default function AlertChips({ alerts, bottomOffset }: AlertChipsProps) {
  const unacked = alerts.filter((a) => !a.acknowledged && a.level !== "escape");

  if (unacked.length === 0) return null;

  const handleAck = async (id: string) => {
    try {
      await acknowledgeAlert(id);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed left-0 right-0 z-20 px-3 pb-2"
      style={{ bottom: `${bottomOffset}px` }}
    >
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {unacked.slice(0, 10).map((a) => (
          <button
            key={a.id}
            onClick={() => handleAck(a.id)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border shadow-sm ${
              levelColors[a.level] ?? "bg-gray-100 text-gray-800 border-gray-200"
            }`}
          >
            {a.message.length > 40
              ? `${a.message.slice(0, 37)}...`
              : a.message}
          </button>
        ))}
      </div>
    </div>
  );
}
