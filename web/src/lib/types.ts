export interface GpsReading {
  lat: number;
  lon: number;
  alt: number | null;
  speed: number | null;
  heading: number | null;
  sats: number | null;
  hdop: number | null;
  pdop: number | null;
}

export interface TrackPoint {
  device_id: string;
  dog_id: string | null;
  reading: GpsReading;
  received_at: string;
  rssi: number | null;
  snr: number | null;
}

export interface Coordinate {
  lat: number;
  lon: number;
}

export interface Geofence {
  id: string;
  name: string;
  vertices: Coordinate[];
  buffer_meters: number;
  enabled: boolean;
  zone_type: "safe" | "label";
}

export interface DogProfile {
  id: string;
  name: string;
  device_id: string | null;
  geofence_ids: string[];
  notes: string;
  created_at: string;
}

export type AlertLevel = "info" | "warning" | "breach" | "escape";
export type AlertType =
  | "boundary_approach"
  | "geofence_breach"
  | "escape_detected"
  | "signal_lost"
  | "return_detected";

export interface Alert {
  id: string;
  dog_id: string;
  device_id: string;
  type: AlertType;
  level: AlertLevel;
  geofence_id: string | null;
  message: string;
  lat: number | null;
  lon: number | null;
  acknowledged: boolean;
  created_at: string;
}

export type ConnectionStatusValue =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"
  | "scanning";

export interface ConnectionState {
  status: ConnectionStatusValue;
  connection_type: string | null;
  detail: string | null;
  since: string;
}

export interface BLEScanResult {
  address: string;
  name: string | null;
  rssi: number | null;
}

export interface SwitchRequest {
  connection_type: string;
  serial_port?: string;
  tcp_host?: string;
  tcp_port?: number;
  ble_address?: string;
  broker_host?: string;
  broker_port?: number;
  mqtt_username?: string;
  mqtt_password?: string;
  mqtt_topic?: string;
  mqtt_tls?: boolean;
}

export interface Pack {
  id: string;
  name: string;
  mqtt_topic_prefix: string;
  created_at: string;
  created_by: string;
}

export interface PackMember {
  pack_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  display_name?: string;
}

export interface PackInvite {
  code: string;
  pack_id: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  used_by: string | null;
}

export interface DeviceTelemetry {
  device_id: string;
  battery_level: number | null;
  voltage: number | null;
  uptime_seconds: number | null;
  channel_utilization: number | null;
  air_util_tx: number | null;
  rssi: number | null;
  snr: number | null;
  timestamp: string;
  received_at: string;
}

export interface NoiseProfile {
  device_id: string;
  noise_radius_m: number;
  sample_count: number;
  last_updated: string;
  confidence: number;
}

export interface DetectionStatus {
  device_id: string;
  dog_id: string | null;
  altitude_rejected: number;
  jump_rejected: number;
  fixes_evaluated: number;
  breach_window: boolean[];
  breach_count: number;
  breach_needed: number;
  noise_suppressed: boolean;
  last_evaluated: string | null;
  last_filtered_at: string | null;
}
