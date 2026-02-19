"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ApiProvider, ClerkApiProvider } from "@/lib/api-provider";

const HAS_CLERK = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function Providers({ children }: { children: React.ReactNode }) {
  if (HAS_CLERK) {
    return (
      <ClerkProvider>
        <ClerkApiProvider>{children}</ClerkApiProvider>
      </ClerkProvider>
    );
  }
  return <ApiProvider>{children}</ApiProvider>;
}
