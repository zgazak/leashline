"use client";

import { useEffect, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useSSE(
  path: string,
  eventName: string,
  onMessage: (data: unknown) => void,
) {
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;

  useEffect(() => {
    const es = new EventSource(`${API_URL}${path}`);

    es.addEventListener(eventName, (e) => {
      try {
        const parsed = JSON.parse(e.data);
        cbRef.current(parsed);
      } catch {
        // ignore malformed events
      }
    });

    es.onerror = () => {
      // EventSource auto-reconnects
    };

    return () => es.close();
  }, [path, eventName]);
}
