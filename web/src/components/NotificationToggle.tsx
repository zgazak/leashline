"use client";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import type { Api } from "@/lib/auth-api";

export default function NotificationToggle({ api }: { api: Api }) {
  const { state, subscribed, subscribe, unsubscribe } = usePushNotifications(api);

  if (state === "unsupported") return null;

  return (
    <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between text-sm">
      <span className="text-gray-600">Push alerts</span>
      {state === "loading" ? (
        <span className="text-gray-400 text-xs">...</span>
      ) : state === "denied" ? (
        <span className="text-gray-400 text-xs">Blocked</span>
      ) : subscribed ? (
        <button
          onClick={unsubscribe}
          className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200"
        >
          On
        </button>
      ) : (
        <button
          onClick={subscribe}
          className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded hover:bg-gray-200"
        >
          Off
        </button>
      )}
    </div>
  );
}
