"use client";

import { useEffect, useState } from "react";
import type { Api } from "@/lib/auth-api";
import type { ConnectionState } from "@/lib/types";

const POLL_INTERVAL = 5000;

export function useConnection(api: Api) {
  const [state, setState] = useState<ConnectionState>({
    status: "disconnected",
    connection_type: null,
    detail: null,
    since: new Date().toISOString(),
  });

  useEffect(() => {
    let active = true;

    const poll = () => {
      api.getConnectionStatus().then((data) => {
        if (active) setState(data);
      }).catch(() => {});
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => { active = false; clearInterval(id); };
  }, [api]);

  return state;
}
