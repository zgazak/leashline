"use client";

import { useCallback, useEffect, useState } from "react";
import type { Api } from "@/lib/auth-api";
import type { ConnectionState } from "@/lib/types";
import { useSSE } from "./useSSE";

export function useConnection(api: Api) {
  const [state, setState] = useState<ConnectionState>({
    status: "disconnected",
    connection_type: null,
    detail: null,
    since: new Date().toISOString(),
  });
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    api.getConnectionStatus().then(setState).catch(() => {});
    api.getToken().then(setToken).catch(() => {});
  }, [api]);

  const onMessage = useCallback((data: unknown) => {
    setState(data as ConnectionState);
  }, []);

  useSSE("/stream/connection", "connection", onMessage, token);

  return state;
}
