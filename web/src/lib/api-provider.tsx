"use client";

import { createContext, useContext, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { createAuthApi } from "./auth-api";
import type { Api } from "./auth-api";

const ApiContext = createContext<Api | null>(null);

const unauthApi = createAuthApi(async () => null);

export function ApiProvider({ children }: { children: React.ReactNode }) {
  return (
    <ApiContext.Provider value={unauthApi}>{children}</ApiContext.Provider>
  );
}

export function ClerkApiProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const api = useMemo(() => createAuthApi(() => getToken()), [getToken]);
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): Api {
  const api = useContext(ApiContext);
  if (!api) throw new Error("useApi must be used within an ApiProvider");
  return api;
}
