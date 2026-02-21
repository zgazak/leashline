"use client";

import { useEffect, useState } from "react";
import type { Api } from "@/lib/auth-api";
import type { DeviceTelemetry } from "@/lib/types";

const POLL_INTERVAL = 30000;

export function useTelemetry(api: Api) {
  const [telemetry, setTelemetry] = useState<Record<string, DeviceTelemetry>>({});

  useEffect(() => {
    let active = true;

    const poll = () => {
      api.getLatestTelemetry().then((data) => {
        if (active) setTelemetry(data);
      }).catch(() => {});
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => { active = false; clearInterval(id); };
  }, [api]);

  return telemetry;
}
