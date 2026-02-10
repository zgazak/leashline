"use client";

import { useCallback, useEffect, useState } from "react";
import { getLatestPositions } from "@/lib/api";
import type { TrackPoint } from "@/lib/types";
import { useSSE } from "./useSSE";

export function usePositions() {
  const [positions, setPositions] = useState<Record<string, TrackPoint>>({});

  useEffect(() => {
    getLatestPositions()
      .then(setPositions)
      .catch(() => {});
  }, []);

  const onMessage = useCallback((data: unknown) => {
    const tp = data as TrackPoint;
    if (tp.device_id) {
      setPositions((prev) => ({ ...prev, [tp.device_id]: tp }));
    }
  }, []);

  useSSE("/stream/positions", "position", onMessage);

  return positions;
}
