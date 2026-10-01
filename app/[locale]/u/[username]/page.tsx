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
  // This segment must not have a loading.tsx: a loading boundary flushes a 200 shell before this
  // notFound() runs, and anything.kurl.me would answer 200 instead of 404.
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
      <div className="container max-w-md py-10">
        <ProfileHeader
          username={profile.username}
          bio={profile.bio}
          avatarUrl={profile.avatarUrl}
          bannerUrl={profile.bannerUrl}
          colors={colors}
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
          <a
            href={authorHref(profile.username, locale)}
            className={`profile-card mt-2.5 flex items-center gap-3 px-4 py-3.5 ${colors.card} ${colors.cardBorder} ${colors.cardHover}`}
          >
            <BookOpen className={`h-5 w-5 shrink-0 ${colors.muted}`} aria-hidden />
            <span className={`min-w-0 flex-1 truncate text-sm font-medium ${colors.primary}`}>
              {t("viewBlog", { count: profile.publishedPostCount })}
            </span>
            <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${colors.muted}`} aria-hidden />
          </a>
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
