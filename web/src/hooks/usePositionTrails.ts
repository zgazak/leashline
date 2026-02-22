"use client";

import { useEffect, useState } from "react";
import type { Api } from "@/lib/auth-api";
import type { TrackPoint } from "@/lib/types";

const POLL_INTERVAL = 30_000;

export function usePositionTrails(
  api: Api,
  positions: Record<string, TrackPoint>,
) {
  const [trails, setTrails] = useState<Record<string, TrackPoint[]>>({});

  useEffect(() => {
    let active = true;

    const poll = async () => {
      const deviceIds = Object.keys(positions);
      if (deviceIds.length === 0) return;

      const results: Record<string, TrackPoint[]> = {};
      await Promise.all(
        deviceIds.map(async (deviceId) => {
          try {
            const pts = await api.getDevicePositions(deviceId, 5);
            if (active) results[deviceId] = pts;
          } catch {
            // ignore per-device errors
          }
        }),
      );

      if (active) setTrails(results);
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [api, Object.keys(positions).sort().join(",")]);

  return trails;
}
