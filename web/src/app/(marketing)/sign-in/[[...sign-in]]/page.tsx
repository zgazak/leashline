"use client";

import { ClerkProvider, SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const params = useSearchParams();
  const redirectUrl = params.get("redirect_url") || "/dashboard";

  return (
    <ClerkProvider>
      <div className="flex min-h-[60vh] items-center justify-center py-12">
        <SignIn forceRedirectUrl={redirectUrl} />
      </div>
    </ClerkProvider>
  );
}
