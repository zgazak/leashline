"use client";

import { useEffect, useState } from "react";
import type { Api } from "@/lib/auth-api";
import type { Alert } from "@/lib/types";

const POLL_INTERVAL = 5000;

export function useAlerts(api: Api) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    let active = true;

    const poll = () => {
      api.listAlerts().then((data) => {
        if (active) setAlerts(data);
      }).catch(() => {});
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => { active = false; clearInterval(id); };
  }, [api]);

  return alerts;
}
