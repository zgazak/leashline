"use client";

import Providers from "../providers";
import { CacheVersionManager } from "@/components/pwa/cache-version-manager";
import { PWAProvider } from "@/components/pwa/pwa-provider";
import { VersionCheck } from "@/components/pwa/version-check";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CacheVersionManager>
      <PWAProvider>
        <VersionCheck />
        <div className="h-screen overflow-hidden">
          <Providers>{children}</Providers>
        </div>
      </PWAProvider>
    </CacheVersionManager>
  );
}
