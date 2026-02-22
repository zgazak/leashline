"use client";

import { useEffect, useState } from "react";
import type { Api } from "@/lib/auth-api";
import type { TrackPoint } from "@/lib/types";

const POLL_INTERVAL = 5000;

export function usePositions(api: Api) {
  const [positions, setPositions] = useState<Record<string, TrackPoint>>({});

  useEffect(() => {
    let active = true;

    const poll = () => {
      api.getLatestPositions().then((data) => {
        if (active) setPositions(data);
      }).catch(() => {});
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => { active = false; clearInterval(id); };
  }, [api]);

  return positions;
}
