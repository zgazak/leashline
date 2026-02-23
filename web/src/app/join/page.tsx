"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { previewInvite } from "@/lib/api";

type State =
  | { status: "loading" }
  | { status: "invalid"; message: string }
  | { status: "preview"; packName: string; expiresAt: string }
  | { status: "joining" }
  | { status: "joined"; packName: string }
  | { status: "error"; message: string };

function JoinContent() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get("code") || "";
  const [state, setState] = useState<State>({ status: "loading" });
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(document.cookie.includes("__session"));
  }, []);

  useEffect(() => {
    if (!code) {
      setState({ status: "invalid", message: "No invite code provided." });
      return;
    }
    previewInvite(code)
      .then((data) =>
        setState({ status: "preview", packName: data.pack_name, expiresAt: data.expires_at }),
      )
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("410")) {
          setState({ status: "invalid", message: "This invite has expired or already been used." });
        } else if (msg.includes("404")) {
          setState({ status: "invalid", message: "Invalid invite code." });
        } else {
          setState({ status: "invalid", message: "Could not load invite." });
        }
      });
  }, [code]);

  const handleJoin = async () => {
    setState({ status: "joining" });
    try {
      const token = document.cookie
        .split("; ")
        .find((c) => c.startsWith("__session="))
        ?.split("=")
        .slice(1)
        .join("=");

      const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");
      const res = await fetch(`${API_URL}/packs/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        if (text.includes("already belongs")) {
          setState({ status: "error", message: "You already belong to a pack." });
        } else {
          setState({ status: "error", message: text });
        }
        return;
      }

      const pack = await res.json();
      setState({ status: "joined", packName: pack.name });
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Join failed" });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-8 text-center">
      {state.status === "loading" && (
        <p className="text-gray-500">Loading invite...</p>
      )}

      {state.status === "invalid" && (
        <>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
          <p className="text-gray-500 text-sm mb-6">{state.message}</p>
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Go to Leashline
          </Link>
        </>
      )}

      {state.status === "preview" && (
        <>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Join {state.packName}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            You&apos;ve been invited to join the <strong>{state.packName}</strong> pack on Leashline.
          </p>
          {signedIn ? (
            <button
              onClick={handleJoin}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Join Pack
            </button>
          ) : (
            <div className="space-y-3">
              <Link
                href={`/sign-up?redirect_url=${encodeURIComponent(`/join?code=${code}`)}`}
                className="block w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Sign Up to Join
              </Link>
              <Link
                href={`/sign-in?redirect_url=${encodeURIComponent(`/join?code=${code}`)}`}
                className="block text-sm text-gray-500 hover:text-gray-700"
              >
                Already have an account? Sign in
              </Link>
            </div>
          )}
        </>
      )}

      {state.status === "joining" && (
        <p className="text-gray-500">Joining pack...</p>
      )}

      {state.status === "joined" && (
        <>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Welcome!</h1>
          <p className="text-gray-500 text-sm mb-6">
            You&apos;ve joined <strong>{state.packName}</strong>.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Go to Dashboard
          </button>
        </>
      )}

      {state.status === "error" && (
        <>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-red-500 text-sm mb-6">{state.message}</p>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Go to Dashboard
          </Link>
        </>
      )}
    </div>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={<p className="text-gray-500">Loading...</p>}>
        <JoinContent />
      </Suspense>
    </div>
  );
}
