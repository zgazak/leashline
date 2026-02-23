"use client";

import { useEffect, useMemo, useState } from "react";
import type { Api } from "@/lib/auth-api";
import type { TrackPoint } from "@/lib/types";

const POLL_INTERVAL = 30_000;

export function usePositionTrails(
  api: Api,
  positions: Record<string, TrackPoint>,
) {
  const [trails, setTrails] = useState<Record<string, TrackPoint[]>>({});
  const deviceKey = useMemo(() => Object.keys(positions).sort().join(","), [positions]);

  useEffect(() => {
    let active = true;
    const deviceIds = deviceKey ? deviceKey.split(",") : [];

    const poll = async () => {
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
  }, [api, deviceKey]);

  return trails;
}
