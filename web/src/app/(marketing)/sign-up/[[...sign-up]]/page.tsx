"use client";

import { ClerkProvider, SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function SignUpPage() {
  const params = useSearchParams();
  const redirectUrl = params.get("redirect_url") || "/dashboard";

  return (
    <ClerkProvider>
      <div className="flex min-h-[60vh] items-center justify-center py-12">
        <SignUp forceRedirectUrl={redirectUrl} />
      </div>
    </ClerkProvider>
  );
}
