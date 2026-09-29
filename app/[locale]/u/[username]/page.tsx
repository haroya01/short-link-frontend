import type { Metadata } from "next";
import { serializeJsonLd } from "@/lib/json-ld";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProfileOwnerFab } from "@/modules/profile/components/owner-fab";
import { ProfileShareFab } from "@/modules/profile/components/share-fab";
import type { PublicProfile } from "@/types";
import { MadeWithKurl } from "@/components/common/made-with-kurl";
import { EntryList } from "./_components/entry-list";
import { ProfileHeader } from "./_components/profile-header";
import { ProfileVisitBeacon } from "./_components/profile-visit-beacon";
import { ShareRow } from "./_components/share-row";
import { THEME_TABLE } from "./_lib/theme";
import { fetchProfile } from "./_lib/fetch-profile";
import { authorHref } from "@/modules/blog/lib/author-href";
import { ArrowRight, BookOpen } from "lucide-react";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}): Promise<Metadata> {
  const { locale, username } = await params;
  const profile = await fetchProfile(username).catch(() => null);
  if (!profile) return { title: `@${username}` };
  const entries = profile.entries ?? [];
  // og:image comes from ./opengraph-image.tsx (paper card: avatar + handle + bio, banner beside it).
  // Crawler caching note: KakaoTalk pins a scraped preview for ~24h — owners retest with Kakao's
  // 공유 디버거 (https://developers.kakao.com/tool/debugger/sharing) to force-refresh.
  const profileUrl = `${SITE_URL}/${locale}/u/${profile.username}`;
  return {
    title: `@${profile.username} · kurl`,
    description: profile.bio ?? `${entries.filter((e) => e.kind === "LINK").length} links`,
    alternates: { canonical: profileUrl },
    openGraph: {
      title: `@${profile.username} · kurl`,
      description: profile.bio ?? undefined,
      url: profileUrl,
      type: "profile",
      siteName: "kurl",
    },
    twitter: {
      card: "summary_large_image",
      title: `@${profile.username} · kurl`,
      description: profile.bio ?? undefined,
    },
  };
}

// Phase E (subdomain 실제 동작) 검증 후 NEXT_PUBLIC_AUTHOR_SUBDOMAIN_REDIRECT=true 로 enable.
// 그 전엔 /u/{username} 그대로 유지 — 안 그러면 visitors 가 dead URL 로 redirect 됨.
// Decision: [[decisions/2026-05-29-product-surface-c-lite]]
const AUTHOR_SUBDOMAIN_REDIRECT_ENABLED =
  process.env.NEXT_PUBLIC_AUTHOR_SUBDOMAIN_REDIRECT === "true";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  if (AUTHOR_SUBDOMAIN_REDIRECT_ENABLED) {
    redirect(`https://${username}.kurl.me/${locale}/`);
  }
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
  const profileUrl = `${SITE_URL}/${locale}/u/${profile.username}`;
  // ProfilePage > Person — gives Google a structured signal for rich snippets (name + image +
  // bio + linked social profiles). sameAs propagates trust between this page and the verified
  // accounts the visitor lists in their socials.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: profileUrl,
    mainEntity: {
      "@type": "Person",
      name: profile.username,
      alternateName: `@${profile.username}`,
      url: profileUrl,
      ...(profile.bio ? { description: profile.bio } : {}),
      ...(profile.avatarUrl ? { image: profile.avatarUrl } : {}),
      ...(profile.socials && profile.socials.length > 0
        ? { sameAs: profile.socials.map((s) => s.url) }
        : {}),
    },
  };

  return (
    <div className={`min-h-screen ${colors.page}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
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
            width={1500}
            height={500}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      {/* relative: 표지는 mask-image 때문에 따로 쌓이는 층이라, 위치 없는 머리는 그 아래에 깔린다 —
          진입 애니메이션이 꺼지는 첫 로드·동작 줄이기에서 아바타가 표지에 가려졌다. */}
      <div className={`relative container max-w-md ${profile.bannerUrl ? "-mt-12 pb-12" : "py-12"}`}>
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
        {/* Bridge into the weblog: shown only when this author has published posts, so the
            link-in-bio surface can reach /p/<user> (the profile→blog direction, mirroring blog→profile). */}
        {profile.publishedPostCount > 0 && (
          <div className="mt-5 flex justify-center">
            <a
              href={authorHref(profile.username, locale)}
              className={`focus-ring inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-80 ${colors.cardBorder} ${colors.card} ${colors.primary}`}
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              {t("viewBlog", { count: profile.publishedPostCount })}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        )}
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
        <div className="mt-6 flex justify-center">
          <MadeWithKurl tone={{ text: colors.muted, strong: colors.primary, border: colors.cardBorder }} />
        </div>
      </div>
      <ProfileShareFab
        url={`${SITE_URL}/u/${profile.username}`}
        filename={`${profile.username}.png`}
      />
      <ProfileOwnerFab username={profile.username} />
      <ProfileVisitBeacon username={profile.username} />
    </div>
  );
}
