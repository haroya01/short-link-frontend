import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const runtime = "edge";
export const alt = "kurl.me";
// 2400×1260 = 권장 1200×630 의 2x. Retina / 카톡 인앱 미리보기에서 워드마크 가장자리 또렷.
// 모든 내부 치수(padding/font/mark) 도 동일 비율로 2배 — 1x 비례 그대로 유지.
export const size = { width: 2400, height: 1260 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "login" });

  // 로그인 BrandRotator 의 마지막 phrase(=통계) 를 OG 의 brand tagline 으로 재사용.
  // 공유 카드 본 사람이 로그인 surface 에 와서 같은 카피를 다시 만나게 하는 의도.
  let tagline = "";
  try {
    const raw = t.raw("rotation") as unknown;
    if (Array.isArray(raw) && raw.length > 0) {
      tagline = String(raw[raw.length - 1] ?? raw[0]);
    }
  } catch {
    // rotation 키 누락 locale 은 tagline 없이 mark + 워드마크 + 푸터만.
  }

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
          // Satori 는 filter:blur() 미지원 — radial-gradient falloff 로 halo 흉내.
          // `circle <radius>` 단일 size 만 안정적 (ellipse 두 dim 은 파서 거부).
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
              <linearGradient id="og-mark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>
            <g fill="url(#og-mark)">
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
            kurl
            <span style={{ color: "#94a3b8" }}>.me</span>
          </div>

          {tagline ? (
            <div
              style={{
                display: "flex",
                fontSize: 76,
                color: "#475569",
                marginTop: 80,
              }}
            >
              {renderWithMeAccent(tagline)}
            </div>
          ) : null}
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
          <span>kurl.me</span>
          <span>{locale}</span>
        </div>
      </div>
    ),
    size,
  );
}

function renderWithMeAccent(phrase: string) {
  // Satori 가 span 경계의 trailing space 를 trim 하므로 " .me" 의 leading space 를 styled span
  // 안쪽에 포함시켜 살린다. whiteSpace:'pre' 까지 박아야 span 안 leading space 도 안전.
  const parts = phrase.split(/( ?\.me)/g);
  return parts.map((part, i) =>
    /^ ?\.me$/.test(part) ? (
      <span key={i} style={{ color: "#94a3b8", whiteSpace: "pre" }}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
