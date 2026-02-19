"use client";

import { useCallback, useEffect, useState } from "react";
import type { Api } from "@/lib/auth-api";
import type { Alert } from "@/lib/types";
import { useSSE } from "./useSSE";

export function useAlerts(api: Api) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    api.listAlerts().then(setAlerts).catch(() => {});
    api.getToken().then(setToken).catch(() => {});
  }, [api]);

  const onMessage = useCallback((data: unknown) => {
    const alert = data as Alert;
    setAlerts((prev) => [alert, ...prev]);
  }, []);

  useSSE("/stream/alerts", "alert", onMessage, token);

  return alerts;
}
