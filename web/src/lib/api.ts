import type {
  Alert,
  BLEScanResult,
  ConnectionState,
  DogProfile,
  Geofence,
  SwitchRequest,
  TrackPoint,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  };
}

// Default (unauthenticated) API instance for backwards compatibility
const defaultApi = createApi();

export const listDogs = defaultApi.listDogs;
export const getDog = defaultApi.getDog;
export const createDog = defaultApi.createDog;
export const deleteDog = defaultApi.deleteDog;
export const listGeofences = defaultApi.listGeofences;
export const getLatestPositions = defaultApi.getLatestPositions;
export const getDevicePositions = defaultApi.getDevicePositions;
export const listAlerts = defaultApi.listAlerts;
export const acknowledgeAlert = defaultApi.acknowledgeAlert;
export const getConnectionStatus = defaultApi.getConnectionStatus;
export const switchConnection = defaultApi.switchConnection;
export const scanBLE = defaultApi.scanBLE;

export { createApi };
