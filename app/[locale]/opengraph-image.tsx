import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "kurl · URL shortener with click analytics";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#f8fafc",
          padding: 80,
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ width: 96, height: 12, borderRadius: 6, background: "#0ea5e9" }} />
            <div style={{ width: 140, height: 12, borderRadius: 6, background: "#0ea5e9" }} />
            <div style={{ width: 84, height: 12, borderRadius: 6, background: "#0ea5e9" }} />
          </div>
          <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -2 }}>kurl</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -3,
            }}
          >
            URL 단축 +
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -3,
              color: "#94a3b8",
            }}
          >
            클릭 분석
          </div>
          <div style={{ marginTop: 16, fontSize: 28, color: "#cbd5e1" }}>
            디바이스 · 채널 · 국가 · 시간대 — 누가 어디서 클릭했는지 한눈에
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            color: "#64748b",
            fontFamily: "monospace",
          }}
        >
          <span>kurl.me</span>
          <span>v1</span>
        </div>
      </div>
    ),
    size,
  );
}
