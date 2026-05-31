import { ImageResponse } from "next/og";
import { listPublicPosts } from "@/modules/blog/api/public-posts";

// nodejs (not edge): we fetch the post to put its title on the card, so the API client + env are needed.
export const runtime = "nodejs";
export const alt = "blog.kurl";
// 2400×1260 = 권장 1200×630 의 2x — 카톡/라인 인앱 미리보기에서 또렷.
export const size = { width: 2400, height: 1260 };
export const contentType = "image/png";

/**
 * Per-post share card. This is the share-parity answer to "images optional" (AGENTS §10.4): an
 * image-less post still unfurls as a branded card built from its title + author, not a blank or a
 * generic feed cover. Title-first, quiet, on the blog.kurl brand surface.
 */
export default async function PostOgImage({
  params,
}: {
  params: Promise<{ locale: string; username: string; slug: string }>;
}) {
  const { locale, username, slug } = await params;
  let title = "blog.kurl";
  let handle = username;
  try {
    const result = await listPublicPosts(username);
    if (result.ok) {
      handle = result.data.author.username;
      const post = result.data.posts.find((p) => p.slug === slug);
      if (post?.title) title = post.title;
    }
  } catch {
    // Fall back to the brand card if the post can't be fetched at render time.
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 160,
          backgroundColor: "#ffffff",
          // Satori 는 filter:blur 미지원 — radial falloff 로 halo (브랜드/blog OG 동일).
          backgroundImage:
            "radial-gradient(circle 1100px at 18% 8%, rgba(167, 243, 208, 0.55) 0%, rgba(255, 255, 255, 0) 60%)",
        }}
      >
        {/* Wordmark row */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="120" height="78" viewBox="0 0 28 18" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="post-og-mark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>
            <g fill="url(#post-og-mark)">
              <rect x="6" y="1" width="20" height="3.4" rx="1.7" />
              <rect x="0" y="7.3" width="28" height="3.4" rx="1.7" />
              <rect x="9" y="13.6" width="17" height="3.4" rx="1.7" />
            </g>
          </svg>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: -2, color: "#0f172a" }}>
            blog<span style={{ color: "#94a3b8" }}>.kurl</span>
          </div>
        </div>

        {/* Title — the hero of the card */}
        <div
          style={{
            display: "flex",
            maxHeight: 640,
            overflow: "hidden",
            fontSize: 116,
            fontWeight: 700,
            lineHeight: 1.18,
            letterSpacing: -2.5,
            color: "#0f172a",
          }}
        >
          {title}
        </div>

        {/* Author + host */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 44,
          }}
        >
          <span style={{ display: "flex", color: "#047857", fontWeight: 600 }}>@{handle}</span>
          <span style={{ display: "flex", color: "#94a3b8", fontFamily: "monospace" }}>
            blog.kurl.me · {locale}
          </span>
        </div>
      </div>
    ),
    size,
  );
}
