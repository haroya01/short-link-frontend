import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProfileOwnerFab } from "@/components/profile-owner-fab";
import { ProfileShareFab } from "@/components/profile-share-fab";
import type { PublicProfile } from "@/types";
import { EntryList } from "./_components/EntryList";
import { ProfileHeader } from "./_components/ProfileHeader";
import { ShareRow } from "./_components/ShareRow";
import { THEME_TABLE } from "./_lib/theme";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://app.kurl.me");

async function fetchProfile(username: string): Promise<PublicProfile | null> {
  // Short revalidate so owner edits show up within ~30s without smashing the backend per visit.
  // The backend layers a 5min Redis cache that auto-evicts on profile/toggle/reorder writes.
  const res = await fetch(`${API_BASE}/api/v1/public/profiles/${encodeURIComponent(username)}`, {
    next: { revalidate: 30 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("profile fetch failed");
  return (await res.json()) as PublicProfile;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}): Promise<Metadata> {
  const { locale, username } = await params;
  const profile = await fetchProfile(username).catch(() => null);
  if (!profile) return { title: `@${username}` };
  const entries = profile.entries ?? [];
  // OG image: banner (3:1 / 4:1 — already a hero shape) > avatar (square fallback) > nothing.
  // KakaoTalk / Discord / Slack crawlers all read og:image; without it the preview shows just the
  // title text with no thumbnail (which is why pasting kurl.me/u/<handle> into KakaoTalk showed
  // no image before this).
  //
  // <p>Crawler caching note: once a URL has been scraped without an image, KakaoTalk pins that
  // result for ~24h. Telling the owner to retest after deploy + use Kakao's 공유 디버거
  // (https://developers.kakao.com/tool/debugger/sharing) to force-refresh.
  const ogImage = profile.bannerUrl ?? profile.avatarUrl ?? null;
  const profileUrl = `${SITE_URL}/${locale}/u/${profile.username}`;
  return {
    title: `@${profile.username} · kurl`,
    description: profile.bio ?? `${entries.filter((e) => e.kind === "LINK").length} links`,
    alternates: { canonical: profileUrl },
    openGraph: {
      title: `@${profile.username} · kurl`,
      description: profile.bio ?? undefined,
      url: profileUrl,
      images: ogImage
        ? [{ url: ogImage, width: 1200, height: 630, alt: `@${profile.username}` }]
        : undefined,
      type: "profile",
      siteName: "kurl",
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: `@${profile.username} · kurl`,
      description: profile.bio ?? undefined,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  const t = await getTranslations({ locale, namespace: "publicProfile" });
  const profile = await fetchProfile(username);
  if (!profile) notFound();
  // Old-handle redirect: backend resolves the requested handle through history within the
  // 30d grace window, returning the current owner. Surface it as a 308 to the canonical URL
  // so old SNS bio links keep working without leaving stale handles in browser address bars.
  if (profile.username.toLowerCase() !== username.toLowerCase()) {
    redirect(`/${locale}/u/${profile.username}`);
  }

  const colors = THEME_TABLE[profile.theme ?? "default"];

  return (
    <div className={`min-h-screen ${colors.page}`}>
      {profile.bannerUrl && (
        // Full-bleed banner above the container so it reaches the top + side edges of the viewport.
        // `mask-image` softly fades the bottom 25% into transparent → the page bg shows through
        // regardless of theme color, no extra overlay needed. Same effect on mobile and desktop.
        <div
          className="aspect-[3/1] w-full overflow-hidden sm:aspect-[4/1] md:aspect-[5/1]"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, black 75%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, black 75%, transparent 100%)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className={`container max-w-md ${profile.bannerUrl ? "-mt-12 pb-12" : "py-12"}`}>
        <ProfileHeader
          username={profile.username}
          bio={profile.bio}
          avatarUrl={profile.avatarUrl}
          bannerUrl={profile.bannerUrl}
          colors={colors}
          bannerInline={false}
        />
        <EntryList
          entries={profile.entries ?? []}
          username={profile.username}
          colors={colors}
          emptyLabel={t("empty")}
        />
        <ShareRow
          url={`${SITE_URL}/u/${profile.username}`}
          username={profile.username}
          colors={colors}
          socials={profile.socials ?? []}
          labels={{
            visitOn: {
              x: t("visit.x"),
              line: t("visit.line"),
              threads: t("visit.threads"),
              facebook: t("visit.facebook"),
              kakao: t("visit.kakao"),
              instagram: t("visit.instagram"),
              linkedin: t("visit.linkedin"),
            },
            shareMore: t("share.more"),
            copy: t("share.copy"),
            copied: t("share.copied"),
          }}
        />
        <p className={`mt-6 text-center text-[11px] ${colors.muted}`}>{t("madeWith")}</p>
      </div>
      <ProfileShareFab
        url={`${SITE_URL}/u/${profile.username}`}
        filename={`${profile.username}.png`}
      />
      <ProfileOwnerFab username={profile.username} />
    </div>
  );
}
