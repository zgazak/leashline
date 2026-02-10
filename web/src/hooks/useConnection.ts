"use client";

import { useCallback, useEffect, useState } from "react";
import { getConnectionStatus } from "@/lib/api";
import type { ConnectionState } from "@/lib/types";
import { useSSE } from "./useSSE";

export function useConnection() {
  const [state, setState] = useState<ConnectionState>({
    status: "disconnected",
    connection_type: null,
    detail: null,
    since: new Date().toISOString(),
  });

  useEffect(() => {
    getConnectionStatus()
      .then(setState)
      .catch(() => {});
  }, []);

  const onMessage = useCallback((data: unknown) => {
    setState(data as ConnectionState);
  }, []);

  useSSE("/stream/connection", "connection", onMessage);

  return state;
}
