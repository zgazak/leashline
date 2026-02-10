import type {
  Alert,
  BLEScanResult,
  ConnectionState,
  DogProfile,
  Geofence,
  Pack,
  PackMember,
  SwitchRequest,
  TrackPoint,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function createAuthApi(getToken: () => Promise<string | null>) {
  async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await getToken();
    const headers: Record<string, string> = {
      ...(init?.headers as Record<string, string>),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_URL}${path}`, { ...init, headers });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status}: ${text}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  return {
    listDogs: () => fetchJSON<DogProfile[]>("/dogs"),
    getDog: (id: string) => fetchJSON<DogProfile>(`/dogs/${id}`),
    createDog: (req: { name: string; device_id?: string; notes?: string }) =>
      fetchJSON<DogProfile>("/dogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      }),
    deleteDog: (id: string) =>
      fetchJSON<void>(`/dogs/${id}`, { method: "DELETE" }),
    listGeofences: () => fetchJSON<Geofence[]>("/geofences"),
    getLatestPositions: () =>
      fetchJSON<Record<string, TrackPoint>>("/positions/latest"),
    getDevicePositions: (deviceId: string) =>
      fetchJSON<TrackPoint[]>(`/positions/${deviceId}`),
    listAlerts: () => fetchJSON<Alert[]>("/alerts"),
    acknowledgeAlert: (id: string) =>
      fetchJSON<Alert>(`/alerts/${id}/acknowledge`, { method: "POST" }),
    getConnectionStatus: () =>
      fetchJSON<ConnectionState>("/connection/status"),
    switchConnection: (req: SwitchRequest) =>
      fetchJSON<ConnectionState>("/connection/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      }),
    scanBLE: () => fetchJSON<BLEScanResult[]>("/connection/scan"),
    createPack: (name: string) =>
      fetchJSON<Pack>("/packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    getMyPack: () =>
      fetchJSON<{ pack: Pack; members: PackMember[] }>("/packs/me"),
    createInvite: () =>
      fetchJSON<{ code: string; expires_at: string }>("/packs/invite", {
        method: "POST",
      }),
    joinPack: (code: string) =>
      fetchJSON<Pack>("/packs/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      }),
    removeMember: (userId: string) =>
      fetchJSON<void>(`/packs/members/${userId}`, { method: "DELETE" }),
    getToken,
  };
}

export type Api = ReturnType<typeof createAuthApi>;

