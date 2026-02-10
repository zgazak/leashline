"use client";

import { useEffect, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useSSE(
  path: string,
  eventName: string,
  onMessage: (data: unknown) => void,
  token?: string | null,
) {
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;

  useEffect(() => {
    const url = new URL(`${API_URL}${path}`);
    if (token) {
      url.searchParams.set("token", token);
    }

    const es = new EventSource(url.toString());

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
  }, [path, eventName, token]);
}
