import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const runtime = "edge";
export const alt = "kurl · URL shortener with click analytics";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

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
            <div style={{ width: 96, height: 12, borderRadius: 6, background: "#10b981" }} />
            <div style={{ width: 140, height: 12, borderRadius: 6, background: "#10b981" }} />
            <div style={{ width: 84, height: 12, borderRadius: 6, background: "#10b981" }} />
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
            {t("ogHeadlineTop")}
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
            {t("ogHeadlineBottom")}
          </div>
          <div style={{ marginTop: 16, fontSize: 28, color: "#cbd5e1" }}>
            {t("ogSubline")}
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
