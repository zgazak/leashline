"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function PWAUpdateManager() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updateDetectedRef = useRef(false);

  const applyUpdate = useCallback(() => {
    const waiting = registrationRef.current?.waiting;
    if (waiting) {
      waiting.postMessage({ type: "SKIP_WAITING" });
    }
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Listen for SW_ACTIVATED message → reload (only if we detected an update)
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_ACTIVATED" && updateDetectedRef.current) {
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    const trackWaitingWorker = (worker: ServiceWorker) => {
      updateDetectedRef.current = true;
      worker.addEventListener("statechange", () => {
        if (worker.state === "activated") {
          window.location.reload();
        }
      });
      setUpdateAvailable(true);
    };

    navigator.serviceWorker.ready.then((registration) => {
      registrationRef.current = registration;

      // Check if there's already a waiting worker
      if (registration.waiting) {
        trackWaitingWorker(registration.waiting);
      }

      // Listen for new updates
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            trackWaitingWorker(installing);
          }
        });
      });
    });

    // Periodic update checks
    const interval = setInterval(() => {
      registrationRef.current?.update().catch(() => {});
    }, UPDATE_CHECK_INTERVAL);

    // Check for updates on tab focus
    const onFocus = () => {
      registrationRef.current?.update().catch(() => {});
    };
    window.addEventListener("focus", onFocus);

    // Auto-apply update when app goes to background
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && registrationRef.current?.waiting) {
        registrationRef.current.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: "#2563eb",
        color: "white",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "14px",
        boxShadow: "0 -2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <span>Update available</span>
      <button
        onClick={applyUpdate}
        style={{
          background: "white",
          color: "#2563eb",
          border: "none",
          borderRadius: "6px",
          padding: "6px 16px",
          fontWeight: 600,
          fontSize: "14px",
          cursor: "pointer",
        }}
      >
        Reload
      </button>
    </div>
  );
}
