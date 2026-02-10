"use client";

import { useCallback, useEffect, useState } from "react";
import { listAlerts } from "@/lib/api";
import type { Alert } from "@/lib/types";
import { useSSE } from "./useSSE";

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    listAlerts()
      .then(setAlerts)
      .catch(() => {});
  }, []);

  const onMessage = useCallback((data: unknown) => {
    const alert = data as Alert;
    setAlerts((prev) => [alert, ...prev]);
  }, []);

  useSSE("/stream/alerts", "alert", onMessage);

  return alerts;
}
