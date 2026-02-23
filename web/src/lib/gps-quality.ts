import type { TrackPoint } from "@/lib/types";

export type FixQuality = "good" | "fair" | "poor" | "unknown";

export interface FixQualityInfo {
  quality: FixQuality;
  label: string;
  detail: string;
  circleColor: string;
  textColor: string;
  dotColor: string;
  fixFactor: number;
}

/**
 * Mirrors engine's fix_uncertainty_factor() — computes per-fix uncertainty
 * multiplier from GPS quality metadata. Returns 1.0–5.0.
 */
export function computeFixFactor(
  sats: number | null,
  hdop: number | null,
  pdop: number | null = null,
  hdopBaseline = 1.5,
  minSats = 6,
  maxFactor = 5.0,
): number {
  let factor = 1.0;

  if (hdop != null && hdop > hdopBaseline) {
    factor = Math.max(factor, hdop / hdopBaseline);
  }

  if (pdop != null && pdop > hdopBaseline * 1.5) {
    factor = Math.max(factor, pdop / (hdopBaseline * 1.5));
  }

  if (sats != null && sats > 0 && sats < minSats) {
    factor = Math.max(factor, minSats / sats);
  }

  return Math.min(factor, maxFactor);
}

/** Classify a TrackPoint's GPS fix quality for display. */
export function assessFixQuality(tp: TrackPoint): FixQualityInfo {
  const { sats, hdop, pdop } = tp.reading;

  if (sats == null && hdop == null) {
    return {
      quality: "unknown",
      label: "GPS",
      detail: "No quality data",
      circleColor: "#3b82f6",
      textColor: "text-gray-400",
      dotColor: "bg-gray-400",
      fixFactor: 1.0,
    };
  }

  const fixFactor = computeFixFactor(sats, hdop, pdop);

  if (fixFactor <= 1.5) {
    return {
      quality: "good",
      label: "Good GPS",
      detail: sats != null ? `${sats} sats` : `HDOP ${hdop!.toFixed(1)}`,
      circleColor: "#3b82f6",
      textColor: "text-green-600",
      dotColor: "bg-green-500",
      fixFactor,
    };
  }

  if (fixFactor <= 3.0) {
    return {
      quality: "fair",
      label: "Fair GPS",
      detail: sats != null ? `${sats} sats` : `HDOP ${hdop!.toFixed(1)}`,
      circleColor: "#eab308",
      textColor: "text-yellow-600",
      dotColor: "bg-yellow-500",
      fixFactor,
    };
  }

  return {
    quality: "poor",
    label: "Low confidence",
    detail: sats != null ? `${sats} sats` : `HDOP ${hdop!.toFixed(1)}`,
    circleColor: "#f97316",
    textColor: "text-orange-600",
    dotColor: "bg-orange-500",
    fixFactor,
  };
}

/** One-liner for map popup: "Good GPS · 8 sats" */
export function qualitySummary(tp: TrackPoint): string {
  const info = assessFixQuality(tp);
  return `${info.label} \u00B7 ${info.detail}`;
}
