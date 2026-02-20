import type { Metadata } from "next";
import "./globals.css";
import { CacheVersionManager } from "@/components/pwa/cache-version-manager";
import { PWAProvider } from "@/components/pwa/pwa-provider";
import { VersionCheck } from "@/components/pwa/version-check";

export const metadata: Metadata = {
  title: {
    default: "Leashline | Dog Escape Detection",
    template: "%s | Leashline",
  },
  description:
    "Real-time dog escape detection using LoRa radio tracking and smart geofencing. Get instant alerts when your dog leaves their safe zone — no cell coverage needed.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body>
        <CacheVersionManager>
          <PWAProvider>
            <VersionCheck />
            {children}
          </PWAProvider>
        </CacheVersionManager>
      </body>
    </html>
  );
}
