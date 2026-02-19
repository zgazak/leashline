"use client";

import { ClerkProvider, SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <ClerkProvider>
      <div className="flex min-h-[60vh] items-center justify-center py-12">
        <SignUp />
      </div>
    </ClerkProvider>
  );
}
