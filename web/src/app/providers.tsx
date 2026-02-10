"use client";

import { ApiProvider, ClerkApiProvider } from "@/lib/api-provider";

const HAS_CLERK = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function ClerkWrapper({ children }: { children: React.ReactNode }) {
  // Dynamic require — only reached when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set
  const mod = require("@clerk/nextjs") as typeof import("@clerk/nextjs");
  const { ClerkProvider } = mod;
  return (
    <ClerkProvider>
      <ClerkApiProvider>{children}</ClerkApiProvider>
    </ClerkProvider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  if (HAS_CLERK) {
    return <ClerkWrapper>{children}</ClerkWrapper>;
  }
  return <ApiProvider>{children}</ApiProvider>;
}
