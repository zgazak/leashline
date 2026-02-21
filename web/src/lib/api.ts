import type {
  Alert,
  BLEScanResult,
  ConnectionState,
  Coordinate,
  DogProfile,
  Geofence,
  NoiseProfile,
  SwitchRequest,
  TrackPoint,
} from "./types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

type FetchFn = typeof fetch;

function createApi(fetchFn: FetchFn = fetch) {
  async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetchFn(`${API_URL}${path}`, init);
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
    getNoiseProfiles: () =>
      fetchJSON<Record<string, NoiseProfile>>("/noise-profiles/latest"),
    getDeviceNoiseProfile: (deviceId: string) =>
      fetchJSON<NoiseProfile | null>(`/noise-profiles/${deviceId}`),
  };
}

// Default (unauthenticated) API instance for backwards compatibility
const defaultApi = createApi();

export const listDogs = defaultApi.listDogs;
export const getDog = defaultApi.getDog;
export const createDog = defaultApi.createDog;
export const deleteDog = defaultApi.deleteDog;
export const listGeofences = defaultApi.listGeofences;
export const createGeofence = defaultApi.createGeofence;
export const updateGeofence = defaultApi.updateGeofence;
export const deleteGeofence = defaultApi.deleteGeofence;
export const updateDog = defaultApi.updateDog;
export const getLatestPositions = defaultApi.getLatestPositions;
export const getDevicePositions = defaultApi.getDevicePositions;
export const listAlerts = defaultApi.listAlerts;
export const acknowledgeAlert = defaultApi.acknowledgeAlert;
export const getConnectionStatus = defaultApi.getConnectionStatus;
export const switchConnection = defaultApi.switchConnection;
export const scanBLE = defaultApi.scanBLE;
export const getVapidKey = defaultApi.getVapidKey;
export const subscribePush = defaultApi.subscribePush;
export const unsubscribePush = defaultApi.unsubscribePush;
export const getNearbyDevices = defaultApi.getNearbyDevices;
export const getNoiseProfiles = defaultApi.getNoiseProfiles;
export const getDeviceNoiseProfile = defaultApi.getDeviceNoiseProfile;

// Public (no auth) helper for invite preview
const API_URL_EXPORT = API_URL;
export async function previewInvite(code: string): Promise<{ pack_name: string; expires_at: string }> {
  const res = await fetch(`${API_URL_EXPORT}/packs/invite/${encodeURIComponent(code)}`);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

export { createApi };
