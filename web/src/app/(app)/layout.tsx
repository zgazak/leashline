"use client";

import Providers from "../providers";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden">
      <Providers>{children}</Providers>
    </div>
  );
}
