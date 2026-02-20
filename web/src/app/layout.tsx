import type { Metadata } from "next";
import "./globals.css";
import { CacheVersionManager } from "@/components/pwa/cache-version-manager";
import { PWAProvider } from "@/components/pwa/pwa-provider";

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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body>
        <CacheVersionManager>
          <PWAProvider>{children}</PWAProvider>
        </CacheVersionManager>
      </body>
    </html>
  );
}
