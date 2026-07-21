import { ImageResponse } from "next/og";
import { listPublicPosts } from "@/modules/blog/api/public-posts";
import { OG, OgMark, loadAvatar, ogFonts } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "kurl log";
export const size = OG.size;
export const contentType = "image/png";

/** Author home share card — the profile itself: avatar + @handle on the dark brand surface. Bio and
 *  other text are dropped on purpose (mark-forward restraint); the photo + handle is the identity. */
export default async function AuthorOgImage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  let handle = username;
  let avatar: string | null = null;
  try {
    const result = await listPublicPosts(username);
    if (result.ok) {
      handle = result.data.author.username;
      if (result.data.author.avatarUrl) avatar = await loadAvatar(result.data.author.avatarUrl);
    }
  } catch {
    // brand fallback
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
          padding: 150,
          backgroundColor: OG.bg,
          backgroundImage: `${OG.glow}, ${OG.bgGradient}`,
        }}
      >
        {/* Eyebrow — mark + product wordmark, small, top-left */}
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <OgMark width={104} id="author-mark" />
          <div style={{ display: "flex", fontFamily: "Pretendard", fontSize: 56, fontWeight: 700, letterSpacing: -1.5, color: OG.ink }}>
            kurl<span style={{ color: OG.faint }}> log</span>
          </div>
        </div>

        {/* Identity — avatar + handle, the hero */}
        <div style={{ display: "flex", alignItems: "center", gap: 64 }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" src={avatar} width={300} height={300} style={{ width: 300, height: 300, borderRadius: 150, objectFit: "cover", border: "6px solid rgba(255,255,255,0.10)" }} />
          ) : (
            <div
              style={{
                display: "flex",
                width: 300,
                height: 300,
                borderRadius: 150,
                backgroundImage: "linear-gradient(135deg, #34D399 0%, #059669 100%)",
                alignItems: "center",
                justifyContent: "center",
                color: "#06281d",
                fontFamily: "Pretendard",
                fontSize: 150,
                fontWeight: 700,
              }}
            >
              {initial}
            </div>
          )}
          <div style={{ display: "flex", fontFamily: "Pretendard", fontSize: 160, fontWeight: 700, letterSpacing: -4, color: OG.ink }}>
            @{handle}
          </div>
        </div>

        {/* Footer kept empty for breathing room — the bottom edge carries a thin emerald rule */}
        <div style={{ display: "flex", height: 8, width: 200, borderRadius: 4, backgroundImage: "linear-gradient(90deg, #34D399 0%, #059669 100%)" }} />
      </div>
    ),
    { ...size, fonts: await ogFonts(`@${handle}`) },
  );
}
