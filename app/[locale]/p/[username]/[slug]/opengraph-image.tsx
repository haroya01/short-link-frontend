import { ImageResponse } from "next/og";
import { findPublicPost } from "@/modules/blog/api/public-posts";
import { OG, OgMark, loadAvatar, ogFonts } from "@/lib/og";

// nodejs (not edge): we fetch the post for its title/byline + load the brand font (>1 MB).
export const runtime = "nodejs";
export const alt = "blog.kurl";
export const size = OG.size;
export const contentType = "image/png";

/**
 * Per-post share card — dark, title-first. The post title is the hero (the one piece of text that
 * earns the click); byline = avatar + @handle. Everything else (excerpt, date, reading time) is
 * dropped on purpose — a clean, mark-forward card reads premium, not like a stuffed template. Also the
 * share-parity fallback for image-less posts (AGENTS §10.4): no cover → still a branded title card.
 */
export default async function PostOgImage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;

  let title = "blog.kurl";
  let handle = username;
  let avatar: string | null = null;
  try {
    const result = await findPublicPost(username, slug);
    if (result.ok) {
      handle = result.data.author.username;
      title = result.data.post.title || title;
      if (result.data.author.avatarUrl) avatar = await loadAvatar(result.data.author.avatarUrl);
    }
  } catch {
    // brand-only fallback
  }
  const initial = (handle.trim()[0] ?? "?").toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          paddingTop: 140,
          paddingBottom: 130,
          paddingLeft: 168,
          paddingRight: 168,
          backgroundColor: OG.bg,
          backgroundImage: `${OG.glow}, ${OG.bgGradient}`,
        }}
      >
        {/* Signature emerald stripe down the left edge */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: 28,
            backgroundImage: "linear-gradient(180deg, #34D399 0%, #059669 100%)",
          }}
        />

        {/* Eyebrow — mark + product wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <OgMark width={96} id="post-mark" />
          <div style={{ display: "flex", fontFamily: "Pretendard", fontSize: 50, fontWeight: 700, letterSpacing: -1.5, color: OG.ink }}>
            blog<span style={{ color: OG.faint }}>.kurl</span>
          </div>
        </div>

        {/* Hero — the title (up to ~4 lines, clamped) */}
        <div
          style={{
            display: "flex",
            maxHeight: 560,
            overflow: "hidden",
            fontFamily: "Pretendard",
            fontSize: 124,
            fontWeight: 700,
            lineHeight: 1.16,
            letterSpacing: -3,
            color: OG.ink,
          }}
        >
          {title}
        </div>

        {/* Byline — avatar + @handle */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" src={avatar} width={84} height={84} style={{ width: 84, height: 84, borderRadius: 42, objectFit: "cover", border: "4px solid rgba(255,255,255,0.10)" }} />
          ) : (
            <div
              style={{
                display: "flex",
                width: 84,
                height: 84,
                borderRadius: 42,
                backgroundImage: "linear-gradient(135deg, #34D399 0%, #059669 100%)",
                alignItems: "center",
                justifyContent: "center",
                color: "#06281d",
                fontFamily: "Pretendard",
                fontSize: 42,
                fontWeight: 700,
              }}
            >
              {initial}
            </div>
          )}
          <span style={{ display: "flex", fontFamily: "Pretendard", fontSize: 52, fontWeight: 600, color: OG.mute }}>
            @{handle}
          </span>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts(title) },
  );
}
