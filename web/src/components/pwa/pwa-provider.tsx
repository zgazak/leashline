"use client";

import { useEffect } from "react";
import { PWAUpdateManager } from "./pwa-update-manager";

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("SW registration failed:", err);
      });
    }
  }, []);

  return (
    <>
      {children}
      <PWAUpdateManager />
    </>
  );
}
