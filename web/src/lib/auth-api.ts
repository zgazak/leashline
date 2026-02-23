import type {
  Alert,
  BLEScanResult,
  ConnectionState,
  Coordinate,
  DetectionStatus,
  DeviceTelemetry,
  DogProfile,
  Geofence,
  NoiseProfile,
  Pack,
  PackMember,
  SwitchRequest,
  TrackPoint,
} from "./types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

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
    createGeofence: (req: { name: string; vertices: Coordinate[]; buffer_meters?: number; zone_type?: "safe" | "label" }) =>
      fetchJSON<Geofence>("/geofences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      }),
    updateGeofence: (id: string, req: { name?: string; vertices?: Coordinate[]; buffer_meters?: number; enabled?: boolean; zone_type?: "safe" | "label" }) =>
      fetchJSON<Geofence>(`/geofences/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      }),
    deleteGeofence: (id: string) =>
      fetchJSON<void>(`/geofences/${id}`, { method: "DELETE" }),
    updateDog: (id: string, req: { name?: string; device_id?: string; geofence_ids?: string[]; notes?: string }) =>
      fetchJSON<DogProfile>(`/dogs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      }),
    getLatestPositions: () =>
      fetchJSON<Record<string, TrackPoint>>("/positions/latest"),
    getDevicePositions: (deviceId: string, limit?: number) =>
      fetchJSON<TrackPoint[]>(`/positions/${deviceId}${limit ? `?limit=${limit}` : ""}`),
    getPositionHistory: (date: string) =>
      fetchJSON<TrackPoint[]>(`/positions/history?date=${date}`),
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
    previewInvite: (code: string) =>
      fetchJSON<{ pack_name: string; expires_at: string }>(`/packs/invite/${code}`),
    joinPack: (code: string) =>
      fetchJSON<Pack>("/packs/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      }),
    removeMember: (userId: string) =>
      fetchJSON<void>(`/packs/members/${userId}`, { method: "DELETE" }),
    getVapidKey: () =>
      fetchJSON<{ public_key: string }>("/notifications/vapid-key"),
    subscribePush: (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
      fetchJSON<unknown>("/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      }),
    unsubscribePush: (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
      fetchJSON<void>("/notifications/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      }),
    getNearbyDevices: () =>
      fetchJSON<{ device_id: string; last_seen: string; lat: number; lon: number; rssi: number | null; snr: number | null }[]>("/devices/nearby"),
    getLatestTelemetry: () =>
      fetchJSON<Record<string, DeviceTelemetry>>("/telemetry/latest"),
    getNoiseProfiles: () =>
      fetchJSON<Record<string, NoiseProfile>>("/noise-profiles/latest"),
    getDeviceNoiseProfile: (deviceId: string) =>
      fetchJSON<NoiseProfile | null>(`/noise-profiles/${deviceId}`),
    getDetectionStatus: () =>
      fetchJSON<Record<string, DetectionStatus>>("/detection/status"),
  };
}

export type Api = ReturnType<typeof createAuthApi>;

