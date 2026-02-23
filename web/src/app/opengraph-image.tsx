import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Leashline — Dog Escape Detection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #eff6ff 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#111827",
            letterSpacing: "-0.02em",
          }}
        >
          Leashline
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#4b5563",
            marginTop: 16,
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          Dog Escape Detection
        </div>
        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 48,
            fontSize: 20,
            color: "#2563eb",
            fontWeight: 600,
          }}
        >
          <span>No Cell Service Needed</span>
          <span style={{ color: "#d1d5db" }}>|</span>
          <span>No Monthly Fees</span>
          <span style={{ color: "#d1d5db" }}>|</span>
          <span>Miles of Range</span>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 32,
            fontSize: 18,
            color: "#9ca3af",
          }}
        >
          leashline.io
        </div>
      </div>
    ),
    { ...size },
  );
}
