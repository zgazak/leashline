"use client";

import { ClerkProvider, SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <ClerkProvider>
      <div className="flex min-h-[60vh] items-center justify-center py-12">
        <SignIn />
      </div>
    </ClerkProvider>
  );
}
