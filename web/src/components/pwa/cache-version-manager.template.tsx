"use client";

import { useEffect, useState } from "react";

const APP_VERSION = "__APP_VERSION__";
const VERSION_KEY = "leashline-app-version";

export function CacheVersionManager({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(VERSION_KEY);

    if (stored === APP_VERSION) {
      setReady(true);
      return;
    }

    const isUpgrade = stored !== null;

    // Clear all client-side storage
    localStorage.clear();
    sessionStorage.clear();

    // Clear Cache Storage API
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }

    // Clear IndexedDB
    if ("indexedDB" in window) {
      indexedDB.databases?.().then((dbs) =>
        dbs.forEach((db) => {
          if (db.name) indexedDB.deleteDatabase(db.name);
        })
      );
    }

    // Set new version
    localStorage.setItem(VERSION_KEY, APP_VERSION);

    if (isUpgrade) {
      window.location.reload();
    } else {
      setReady(true);
    }
  }, []);

  if (!ready) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          width: "100vw",
          backgroundColor: "white",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "4px solid #e5e7eb",
            borderTopColor: "#2563eb",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <>{children}</>;
}
