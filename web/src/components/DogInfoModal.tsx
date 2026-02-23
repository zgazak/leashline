"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/lib/api-provider";
import type { DetectionStatus, DeviceTelemetry, DogProfile, NoiseProfile, TrackPoint } from "@/lib/types";
import { assessFixQuality } from "@/lib/gps-quality";

interface DogInfoModalProps {
  dog: DogProfile;
  position: TrackPoint | undefined;
  telemetry: DeviceTelemetry | undefined;
  zoneName: string | undefined;
  detectionStatus: DetectionStatus | undefined;
  onClose: () => void;
}

function satsQuality(sats: number): { label: string; color: string } {
  if (sats >= 8) return { label: "Excellent", color: "text-green-600" };
  if (sats >= 5) return { label: "Good", color: "text-green-500" };
  if (sats >= 3) return { label: "Fair", color: "text-yellow-500" };
  return { label: "Poor", color: "text-red-500" };
}

function hdopQuality(hdop: number): { label: string; color: string } {
  if (hdop <= 1) return { label: "Ideal", color: "text-green-600" };
  if (hdop <= 2) return { label: "Excellent", color: "text-green-500" };
  if (hdop <= 5) return { label: "Good", color: "text-yellow-500" };
  if (hdop <= 10) return { label: "Fair", color: "text-orange-500" };
  return { label: "Poor", color: "text-red-500" };
}

function rssiQuality(rssi: number): { label: string; color: string } {
  if (rssi >= -90) return { label: "Strong", color: "text-green-600" };
  if (rssi >= -110) return { label: "Good", color: "text-green-500" };
  if (rssi >= -120) return { label: "Weak", color: "text-yellow-500" };
  return { label: "Very weak", color: "text-red-500" };
}

function snrQuality(snr: number): { label: string; color: string } {
  if (snr >= 5) return { label: "Strong", color: "text-green-600" };
  if (snr >= 0) return { label: "Good", color: "text-green-500" };
  if (snr >= -5) return { label: "Weak", color: "text-yellow-500" };
  return { label: "Very weak", color: "text-red-500" };
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{children}</span>
    </div>
  );
}

export default function DogInfoModal({
  dog,
  position,
  telemetry,
  zoneName,
  detectionStatus,
  onClose,
}: DogInfoModalProps) {
  const api = useApi();
  const [noiseProfile, setNoiseProfile] = useState<NoiseProfile | null | undefined>(undefined);

  useEffect(() => {
    if (!dog.device_id) return;
    api.getDeviceNoiseProfile(dog.device_id)
      .then(setNoiseProfile)
      .catch(() => setNoiseProfile(null));
  }, [api, dog.device_id]);

  const reading = position?.reading;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-96 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{dog.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {zoneName && (
          <p className="text-sm text-green-600 mb-3">at {zoneName}</p>
        )}

        {/* GPS quality summary banner */}
        {(() => {
          if (!position) {
            return (
              <div className="rounded-md px-3 py-2 mb-3 bg-gray-50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
                <span className="text-sm text-gray-500">No GPS data</span>
              </div>
            );
          }
          const qi = assessFixQuality(position);
          const bgMap = { good: "bg-green-50", fair: "bg-yellow-50", poor: "bg-orange-50", unknown: "bg-gray-50" } as const;
          return (
            <div className={`rounded-md px-3 py-2 mb-3 ${bgMap[qi.quality]}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${qi.dotColor}`} />
                <span className={`text-sm font-medium ${qi.textColor}`}>{qi.label} &middot; {qi.detail}</span>
              </div>
              {qi.quality === "poor" && (
                <p className="text-xs text-orange-500 mt-0.5 ml-4">Position may be inaccurate</p>
              )}
            </div>
          );
        })()}

        <div className="space-y-4">
          {/* GPS Signal */}
          <Section title="GPS Signal">
            {reading ? (
              <>
                {reading.sats != null && (() => {
                  const q = satsQuality(reading.sats);
                  return <Row label="Satellites"><span className={q.color}>{reading.sats} ({q.label})</span></Row>;
                })()}
                {reading.hdop != null && (() => {
                  const q = hdopQuality(reading.hdop);
                  return <Row label="HDOP"><span className={q.color}>{reading.hdop.toFixed(1)} ({q.label})</span></Row>;
                })()}
                {reading.pdop != null && (
                  <Row label="PDOP">{reading.pdop.toFixed(1)}</Row>
                )}
                <Row label="Position">
                  <span className="font-mono text-xs">{reading.lat.toFixed(6)}, {reading.lon.toFixed(6)}</span>
                </Row>
                {position && (
                  <Row label="Last fix">{timeAgo(position.received_at)}</Row>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400">No GPS data</p>
            )}
          </Section>

          {/* LoRa Signal (per-fix from TrackPoint) */}
          <Section title="LoRa Signal">
            {position?.rssi != null || position?.snr != null ? (
              <>
                {position?.rssi != null && (() => {
                  const q = rssiQuality(position.rssi);
                  return <Row label="RSSI"><span className={q.color}>{position.rssi} dBm ({q.label})</span></Row>;
                })()}
                {position?.snr != null && (() => {
                  const q = snrQuality(position.snr);
                  return <Row label="SNR"><span className={q.color}>{position.snr.toFixed(1)} dB ({q.label})</span></Row>;
                })()}
              </>
            ) : (
              <p className="text-sm text-gray-400">No LoRa data</p>
            )}
          </Section>

          {/* Noise Model */}
          <Section title="Noise Model">
            {noiseProfile === undefined ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : noiseProfile === null ? (
              <p className="text-sm text-gray-400">Waiting for stationary data</p>
            ) : (
              <>
                <Row label="Status">
                  <span className={noiseProfile.confidence >= 0.8 ? "text-green-600" : "text-yellow-500"}>
                    {noiseProfile.confidence >= 0.8
                      ? "Mature"
                      : `Learning (${Math.round(noiseProfile.confidence * 100)}%)`}
                  </span>
                </Row>
                <Row label="Noise radius">{noiseProfile.noise_radius_m.toFixed(1)}m</Row>
                <Row label="Samples">{noiseProfile.sample_count}</Row>
              </>
            )}
          </Section>

          {/* Detection diagnostics */}
          <Section title="Detection">
            {detectionStatus ? (
              <>
                <Row label="Fixes filtered">
                  {detectionStatus.altitude_rejected + detectionStatus.jump_rejected} of{" "}
                  {detectionStatus.fixes_evaluated + detectionStatus.altitude_rejected + detectionStatus.jump_rejected}
                  <span className="text-gray-400 text-xs ml-1">
                    (alt: {detectionStatus.altitude_rejected}, jump: {detectionStatus.jump_rejected})
                  </span>
                </Row>
                <Row label="Breach window">
                  {detectionStatus.breach_count}/{detectionStatus.breach_window.length} outside
                  <span className="text-gray-400 text-xs ml-1">
                    ({detectionStatus.breach_needed} needed)
                  </span>
                </Row>
                <Row label="Noise suppression">
                  {detectionStatus.noise_suppressed ? (
                    <span className="text-yellow-500">Active</span>
                  ) : (
                    <span className="text-gray-400">&mdash;</span>
                  )}
                </Row>
              </>
            ) : (
              <p className="text-sm text-gray-400">Waiting for data</p>
            )}
          </Section>

          {/* Collar / Telemetry */}
          <Section title="Collar">
            {telemetry ? (
              <>
                {telemetry.battery_level != null && (
                  <Row label="Battery">
                    {telemetry.battery_level}%
                    {telemetry.voltage != null && ` (${telemetry.voltage.toFixed(2)}V)`}
                  </Row>
                )}
                {telemetry.uptime_seconds != null && (
                  <Row label="Uptime">{formatUptime(telemetry.uptime_seconds)}</Row>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400">No telemetry</p>
            )}
          </Section>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
