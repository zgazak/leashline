"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Auth-aware navigation links for the marketing header.
 * Checks for a Clerk session cookie to decide whether to show
 * "Dashboard" or "Sign In / Get Started".
 */
export default function AuthNav() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    // Clerk sets __session cookie when signed in
    setSignedIn(document.cookie.includes("__session"));
  }, []);

  if (signedIn) {
    return (
      <Link
        href="/dashboard"
        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go to Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/sign-in"
        className="text-sm text-gray-600 hover:text-gray-900"
      >
        Sign In
      </Link>
      <Link
        href="/sign-up"
        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Get Started
      </Link>
    </>
  );
}
