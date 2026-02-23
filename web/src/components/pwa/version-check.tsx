"use client";

import { useEffect } from "react";

// __GENERATED__ — version injected by scripts/inject-sw-version.mjs at build time
const UI_VERSION = "1.0.3";

export function VersionCheck() {
  useEffect(() => {
    const checkVersions = async () => {
      try {
        const apiUrl = (
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        ).replace(/\/+$/, "");
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          console.log(
            `%c[Leashline]%c UI: v${UI_VERSION} | API: v${data.version} (${data.stage})`,
            "color: #2563eb; font-weight: bold",
            "color: inherit"
          );
        } else {
          console.warn(
            `[Leashline] UI: v${UI_VERSION} | API: unreachable (${res.status})`
          );
        }
      } catch {
        console.warn(
          `[Leashline] UI: v${UI_VERSION} | API: unreachable`
        );
      }
    };
    checkVersions();
  }, []);

  return null;
}
