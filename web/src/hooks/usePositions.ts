"use client";

import { useCallback, useEffect, useState } from "react";
import type { Api } from "@/lib/auth-api";
import type { TrackPoint } from "@/lib/types";
import { useSSE } from "./useSSE";

export function usePositions(api: Api) {
  const [positions, setPositions] = useState<Record<string, TrackPoint>>({});
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    api.getLatestPositions().then(setPositions).catch(() => {});
    api.getToken().then(setToken).catch(() => {});
  }, [api]);

  const onMessage = useCallback((data: unknown) => {
    const tp = data as TrackPoint;
    if (tp.device_id) {
      setPositions((prev) => ({ ...prev, [tp.device_id]: tp }));
    }
  }, []);

  useSSE("/stream/positions", "position", onMessage, token);

  return positions;
}
