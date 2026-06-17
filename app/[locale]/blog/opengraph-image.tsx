import { ImageResponse } from "next/og";
import { OG, OgMark, ogFonts } from "@/lib/og";

// nodejs (not edge): next/og + the brand font exceed Edge's 1 MB limit (the earlier edge build failed
// at 1.07 MB). Node serverless (50 MB) is fine and OG is crawler-facing.
export const runtime = "nodejs";
export const alt = "blog.kurl";
export const size = OG.size;
export const contentType = "image/png";

// Blog brand card — mark + wordmark only, same restrained system as the root card.
export default async function BlogOgImage() {
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
          gap: 80,
          backgroundColor: OG.bg,
          backgroundImage: `${OG.glow}, ${OG.bgGradient}`,
        }}
      >
        <OgMark width={280} id="blog-mark" />
        <div
          style={{
            display: "flex",
            fontFamily: "Pretendard",
            fontSize: 228,
            fontWeight: 700,
            letterSpacing: -10,
            lineHeight: 1,
            color: OG.ink,
          }}
        >
          blog<span style={{ color: OG.faint }}>.kurl</span>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts("blog.kurl") },
  );
}
