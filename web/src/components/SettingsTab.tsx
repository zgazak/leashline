"use client";

import ConnectionStatus from "@/components/ConnectionStatus";
import NotificationToggle from "@/components/NotificationToggle";
import type { ConnectionState } from "@/lib/types";
import type { Api } from "@/lib/auth-api";

interface SettingsTabProps {
  connectionState: ConnectionState;
  onSwitchConnection: () => void;
  api: Api;
  onOpenPackSettings: () => void;
}

export default function SettingsTab({
  connectionState,
  onSwitchConnection,
  api,
  onOpenPackSettings,
}: SettingsTabProps) {
  return (
    <div>
      <ConnectionStatus state={connectionState} onSwitch={onSwitchConnection} />
      <NotificationToggle api={api} />
      <div className="p-4">
        <button
          onClick={onOpenPackSettings}
          className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium py-2 px-4 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
        >
          Pack settings
        </button>
      </div>
    </div>
  );
}
