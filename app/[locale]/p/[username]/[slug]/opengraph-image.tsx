import { ImageResponse } from "next/og";
import { findPublicPost, type PublicPostBlock } from "@/modules/blog/api/public-posts";

// nodejs (not edge): we fetch the post to put its title/excerpt/byline on the card.
export const runtime = "nodejs";
export const alt = "blog.kurl";
// 2400×1260 = 권장 1200×630 의 2x — 카톡/라인 인앱 미리보기에서 또렷.
export const size = { width: 2400, height: 1260 };
export const contentType = "image/png";

// readingMinutes 는 post-blocks 의 것과 같은 추정식이지만, 그 파일은 client 컴포넌트를 함께
// export 하므로 nodejs OG 라우트에 끌고 오지 않도록 여기 인라인한다 (텍스트 길이 / 500자).
const TEXT_BLOCKS = new Set([
  "PARAGRAPH",
  "H1",
  "H2",
  "H3",
  "QUOTE",
  "LIST_BULLET",
  "LIST_NUMBERED",
]);
function readingMinutes(blocks: PublicPostBlock[]): number {
  let chars = 0;
  for (const b of blocks) {
    if (b.content && TEXT_BLOCKS.has(b.type)) chars += b.content.length;
  }
  return Math.max(1, Math.round(chars / 500));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

function readLabel(mins: number, locale: string): string {
  if (locale === "en") return `${mins} min read`;
  if (locale === "ja") return `${mins}分で読めます`;
  return `${mins}분 읽기`;
}

// Satori crashes the whole render if a remote <img> fails to load — and avatars are user-set, so the
// URL can 404, block CORS, or be webp/avif (which Satori can't decode). Fetch the bytes ourselves,
// accept only png/jpeg, and inline as a data URL. Any failure returns null → the byline falls back to
// an initial monogram. https-only + short timeout + size cap keeps it from hanging or being abused.
async function loadAvatar(rawUrl: string): Promise<string | null> {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:") return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(rawUrl, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!/^image\/(png|jpe?g)$/.test(ct)) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 2_000_000) return null;
    return `data:${ct};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

const EMERALD = "#059669";
const INK = "#0f172a";
const MUTE = "#94a3b8";

/**
 * Per-post share card — light editorial. The post title is the hero; a thin emerald brand stripe
 * runs the full left edge, with the byline (author · date · reading time) anchored below a hairline.
 * This is also the share-parity fallback for image-less posts (AGENTS §10.4): no cover → still a
 * branded, title-first card rather than a blank unfurl.
 */
export default async function PostOgImage({
  params,
}: {
  params: Promise<{ locale: string; username: string; slug: string }>;
}) {
  const { locale, username, slug } = await params;

  let title = "blog.kurl";
  let excerpt: string | null = null;
  let handle = username;
  let dateStr = "";
  let mins = 0;
  let avatarDataUrl: string | null = null;
  try {
    const result = await findPublicPost(username, slug);
    if (result.ok) {
      const { author, post, blocks } = result.data;
      handle = author.username;
      title = post.title || title;
      excerpt = post.excerpt;
      dateStr = formatDate(post.publishedAt);
      mins = readingMinutes(blocks);
      if (author.avatarUrl) avatarDataUrl = await loadAvatar(author.avatarUrl);
    }
  } catch {
    // Fall back to the brand-only card if the post can't be fetched at render time.
  }

  // Byline mark: the author's photo when we could safely load it, else an emerald monogram of their
  // handle's first letter — never a broken image. Korean/Japanese first chars render fine.
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
          paddingTop: 150,
          paddingBottom: 130,
          paddingRight: 170,
          paddingLeft: 200,
          backgroundColor: "#ffffff",
          // Satori 는 filter:blur 미지원 — radial falloff 로 코너 halo (브랜드 OG 와 동일 기법).
          backgroundImage:
            "radial-gradient(circle 900px at 8% 4%, rgba(16, 185, 129, 0.14) 0%, rgba(255,255,255,0) 55%)",
        }}
      >
        {/* Full-height emerald brand stripe on the left edge — the card's signature. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: 26,
            backgroundImage: "linear-gradient(180deg, #10B981 0%, #047857 100%)",
          }}
        />

        {/* Header — wordmark left, author handle right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <svg width="92" height="60" viewBox="0 0 28 18" xmlns="http://www.w3.org/2000/svg">
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
            <div
              style={{ display: "flex", fontSize: 52, fontWeight: 700, letterSpacing: -1.5, color: INK }}
            >
              blog<span style={{ color: MUTE }}>.kurl</span>
            </div>
          </div>
          <div
            style={{ display: "flex", fontSize: 40, fontWeight: 600, color: EMERALD, fontFamily: "monospace" }}
          >
            @{handle}
          </div>
        </div>

        {/* Hero — title + excerpt */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              maxHeight: 396,
              overflow: "hidden",
              fontSize: 112,
              fontWeight: 700,
              lineHeight: 1.14,
              letterSpacing: -3,
              color: INK,
            }}
          >
            {title}
          </div>
          {excerpt ? (
            <div
              style={{
                display: "flex",
                marginTop: 44,
                maxHeight: 132,
                overflow: "hidden",
                fontSize: 44,
                lineHeight: 1.45,
                color: "#64748b",
              }}
            >
              {excerpt}
            </div>
          ) : null}
        </div>

        {/* Byline — hairline + author · date · reading time */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", height: 2, backgroundColor: "#e2e8f0", marginBottom: 40 }} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              {avatarDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarDataUrl}
                  width={52}
                  height={52}
                  style={{ width: 52, height: 52, borderRadius: 26, objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: EMERALD,
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: 26,
                    fontWeight: 700,
                  }}
                >
                  {initial}
                </div>
              )}
              <span style={{ display: "flex", fontSize: 42, fontWeight: 600, color: "#334155" }}>
                @{handle}
              </span>
            </div>
            <div style={{ display: "flex", fontSize: 38, color: MUTE, fontFamily: "monospace" }}>
              {dateStr && mins ? `${dateStr} · ${readLabel(mins, locale)}` : "blog.kurl.me"}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
