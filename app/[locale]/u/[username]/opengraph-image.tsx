import { ImageResponse } from "next/og";
import { OG, OgMark, loadAvatar, ogFonts } from "@/lib/og";
import { fetchProfile } from "./_lib/fetch-profile";

export const runtime = "nodejs";
export const alt = "kurl";
export const size = OG.size;
export const contentType = "image/png";

function clip(text: string, max: number): string {
  const chars = Array.from(text.trim());
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : chars.join("");
}

/** Public profile share card — the same paper card as the author home, with the bio as the line
 *  under the handle and the owner's banner photo as the right panel when they set one. */
export default async function ProfileOgImage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await fetchProfile(username).catch(() => null);
  const handle = profile?.username ?? username;
  const bio = profile?.bio ? clip(profile.bio, 40) : null;
  const [avatar, banner] = await Promise.all([
    profile?.avatarUrl ? loadAvatar(profile.avatarUrl) : Promise.resolve(null),
    profile?.bannerUrl ? loadAvatar(profile.bannerUrl) : Promise.resolve(null),
  ]);
  const initial = (handle.trim()[0] ?? "?").toUpperCase();

  return new ImageResponse(
    (
      <div style={{ height: "100%", width: "100%", display: "flex", backgroundColor: OG.bg }}>
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 140,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <OgMark width={104} />
            <div style={{ display: "flex", fontFamily: "Pretendard", fontSize: 56, fontWeight: 700, letterSpacing: -1.5, color: OG.ink }}>
              kurl
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" src={avatar} width={220} height={220} style={{ width: 220, height: 220, borderRadius: 110, objectFit: "cover", border: `4px solid ${OG.rule}` }} />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: 220,
                  height: 220,
                  borderRadius: 110,
                  backgroundColor: OG.greenSoft,
                  alignItems: "center",
                  justifyContent: "center",
                  color: OG.greenInk,
                  fontFamily: "Pretendard",
                  fontSize: 110,
                  fontWeight: 700,
                }}
              >
                {initial}
              </div>
            )}
            <div style={{ display: "flex", marginTop: 56, fontFamily: "Pretendard", fontSize: banner ? 120 : 150, fontWeight: 700, letterSpacing: -4, color: OG.ink }}>
              @{clip(handle, 20)}
            </div>
            {bio && (
              <div style={{ display: "flex", marginTop: 28, fontFamily: "Pretendard", fontSize: 60, fontWeight: 600, color: OG.mute }}>
                {bio}
              </div>
            )}
          </div>

          <div style={{ display: "flex", height: 10, width: 200, borderRadius: 3, backgroundColor: OG.green }} />
        </div>
        {banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" src={banner} width={860} height={1260} style={{ width: 860, height: 1260, objectFit: "cover" }} />
        )}
      </div>
    ),
    { ...size, fonts: await ogFonts(`@${handle} ${bio ?? ""}`) },
  );
}
