import { ImageResponse } from "next/og";
import { OG, OgMark, ogFonts } from "@/lib/og";

// nodejs (not edge): next/og + the brand font exceed Edge's 1 MB; the node serverless (50 MB) is fine
// and OG is crawler-facing, so cold-start cost is irrelevant.
export const runtime = "nodejs";
export const alt = "kurl.me";
// 2400×1260 = 권장 1200×630 의 2x — 레티나/카톡 인앱 미리보기에서 또렷.
export const size = OG.size;
export const contentType = "image/png";

// Brand card = mark + wordmark, nothing else (GitHub/Google-style restraint). The product line lives
// on the page, not the share card; a clean mark reads more premium than a tagline-stuffed template.
export default async function OgImage() {
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
          gap: 84,
          backgroundColor: OG.bg,
          backgroundImage: `${OG.glow}, ${OG.bgGradient}`,
        }}
      >
        <OgMark width={300} id="root-mark" />
        <div
          style={{
            display: "flex",
            fontFamily: "Pretendard",
            fontSize: 268,
            fontWeight: 700,
            letterSpacing: -12,
            lineHeight: 1,
            color: OG.ink,
          }}
        >
          kurl<span style={{ color: OG.faint }}>.me</span>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts("kurl.me") },
  );
}
