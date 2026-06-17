import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

// nodejs 런타임 — Edge Function 1 MB 한도를 next/og + next-intl 번들(1.07 MB)이 초과해 Vercel
// 배포가 실패했다. Node 서버리스(50 MB 한도)로 전환(형제 p/[username] OG 라우트와 동일). next/og·
// getTranslations 둘 다 node 에서 동작하고, OG 이미지는 크롤러용이라 콜드스타트가 critical 하지 않다.
export const runtime = "nodejs";
export const alt = "blog.kurl";
// 2400×1260 = 권장 1200×630 의 2x. Retina / 카톡 인앱 미리보기에서 워드마크 가장자리 또렷.
// 브랜드 OG 와 동일 비율 — blog 면은 워드마크와 태그라인만 blog.kurl 로 교체.
export const size = { width: 2400, height: 1260 };
export const contentType = "image/png";

export default async function BlogOgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "publicFeed" });

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 160,
          position: "relative",
          backgroundColor: "#ffffff",
          // Satori 는 filter:blur() 미지원 — radial-gradient falloff 로 halo 흉내 (브랜드 OG 동일).
          backgroundImage:
            "radial-gradient(circle 1040px at 50% 44%, rgba(167, 243, 208, 0.65) 0%, rgba(255, 255, 255, 0) 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <svg
            width="460"
            height="296"
            viewBox="0 0 28 18"
            xmlns="http://www.w3.org/2000/svg"
            style={{ marginBottom: 88 }}
          >
            <defs>
              <linearGradient id="blog-og-mark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>
            <g fill="url(#blog-og-mark)">
              <rect x="6" y="1" width="20" height="3.4" rx="1.7" />
              <rect x="0" y="7.3" width="28" height="3.4" rx="1.7" />
              <rect x="9" y="13.6" width="17" height="3.4" rx="1.7" />
            </g>
          </svg>

          <div
            style={{
              display: "flex",
              fontSize: 264,
              fontWeight: 700,
              letterSpacing: -10,
              color: "#0f172a",
              lineHeight: 1,
            }}
          >
            blog
            <span style={{ color: "#94a3b8" }}>.kurl</span>
          </div>

          <div
            style={{
              display: "flex",
              maxWidth: 1680,
              textAlign: "center",
              fontSize: 76,
              fontWeight: 700,
              color: "#1e293b",
              marginTop: 96,
              letterSpacing: -1.5,
            }}
          >
            {t("mastheadTagline")}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 112,
            left: 160,
            right: 160,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 44,
            color: "#94a3b8",
            fontFamily: "monospace",
          }}
        >
          <span>blog.kurl.me</span>
          <span>{locale}</span>
        </div>
      </div>
    ),
    size,
  );
}
