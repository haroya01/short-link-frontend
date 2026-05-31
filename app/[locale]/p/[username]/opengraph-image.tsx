import { ImageResponse } from "next/og";
import { listPublicPosts } from "@/modules/blog/api/public-posts";

export const runtime = "nodejs";
export const alt = "blog.kurl";
export const size = { width: 2400, height: 1260 };
export const contentType = "image/png";

/** Author home share card — @handle + bio on the blog.kurl brand surface. */
export default async function AuthorOgImage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  let handle = username;
  let bio = "";
  try {
    const result = await listPublicPosts(username);
    if (result.ok) {
      handle = result.data.author.username;
      bio = result.data.author.bio ?? "";
    }
  } catch {
    // brand fallback
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
          backgroundImage:
            "radial-gradient(circle 1100px at 18% 8%, rgba(167, 243, 208, 0.55) 0%, rgba(255, 255, 255, 0) 60%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="120" height="78" viewBox="0 0 28 18" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="author-og-mark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>
            <g fill="url(#author-og-mark)">
              <rect x="6" y="1" width="20" height="3.4" rx="1.7" />
              <rect x="0" y="7.3" width="28" height="3.4" rx="1.7" />
              <rect x="9" y="13.6" width="17" height="3.4" rx="1.7" />
            </g>
          </svg>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: -2, color: "#0f172a" }}>
            blog<span style={{ color: "#94a3b8" }}>.kurl</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          <div style={{ display: "flex", fontSize: 148, fontWeight: 700, letterSpacing: -3, color: "#0f172a" }}>
            @{handle}
          </div>
          {bio ? (
            <div style={{ display: "flex", maxHeight: 320, overflow: "hidden", fontSize: 56, lineHeight: 1.4, color: "#475569" }}>
              {bio}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 44, color: "#94a3b8", fontFamily: "monospace" }}>
          blog.kurl.me · {locale}
        </div>
      </div>
    ),
    size,
  );
}
