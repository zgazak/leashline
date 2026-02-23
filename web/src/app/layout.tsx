import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://leashline.io"),
  title: {
    default: "Leashline | Dog Escape Detection",
    template: "%s | Leashline",
  },
  description:
    "Real-time dog escape detection using LoRa radio tracking and smart geofencing. Get instant alerts when your dog leaves their safe zone — no cell coverage needed.",
  openGraph: {
    siteName: "Leashline",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    canonical: "/",
  },
  keywords: [
    "dog GPS tracker",
    "dog escape detection",
    "LoRa dog tracker",
    "no subscription dog tracker",
    "dog tracker without cell service",
    "Meshtastic dog tracker",
    "geofence dog tracker",
    "dog tracking no monthly fee",
  ],
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
        {children}
      </body>
    </html>
  );
}
