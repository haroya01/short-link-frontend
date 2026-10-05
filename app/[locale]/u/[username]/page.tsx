import type { Metadata } from "next";
import { serializeJsonLd } from "@/lib/json-ld";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProfileOwnerFab } from "@/modules/profile/components/owner-fab";
import { ProfileShareFab } from "@/modules/profile/components/share-fab";
import { MadeWithKurl } from "@/components/common/made-with-kurl";
import { EntryList } from "./_components/entry-list";
import { ProfileHeader } from "./_components/profile-header";
import { ProfileVisitBeacon } from "./_components/profile-visit-beacon";
import { ShareRow } from "./_components/share-row";
import { THEME_TABLE } from "./_lib/theme";
import { fetchProfile, type ProfileResult } from "./_lib/fetch-profile";
import { oldHandleRedirect, type SearchParams } from "./_lib/old-handle-redirect";
import { authorHref } from "@/modules/blog/lib/author-href";
import { ArrowRight, BookOpen } from "lucide-react";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";

// 이 라우트에는 loading.tsx(Suspense)를 두지 않는다. 두면 셸이 HTTP 200 으로 먼저 나가, 여기서 던진
// notFound()·redirect() 가 200 + noindex, 200 + meta refresh 로, 페이지가 던지는 순단 오류(500)가 200 으로
// 바뀐다. Next 14.2 는 generateMetadata 의 오류도 페이지 자리에서 다시 던지므로 메타데이터로 올려도 피할
// 수 없다. 옛 핸들은 백엔드가 30일 동안만 지금 주인으로 풀고 그 뒤엔 다른 사람이 가질 수 있어
// 영구(308)로 보내지 않는다.
async function loadProfile(
  username: string,
  locale: string,
  searchParams: SearchParams,
): Promise<Exclude<ProfileResult, { status: 404 }>> {
  const result = await fetchProfile(username);
  if (!result.ok) {
    if (result.status === 404) notFound();
    return result;
  }
  const target = oldHandleRedirect(await headers(), username, result.data.username, locale, searchParams);
  if (target) redirect(target);
  return result;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { locale, username } = await params;
  const result = await loadProfile(username, locale, await searchParams);
  if (!result.ok) return { title: `@${username} · kurl` };
  const profile = result.data;
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

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; username: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale, username } = await params;
  const t = await getTranslations({ locale, namespace: "publicProfile" });
  const result = await loadProfile(username, locale, await searchParams);
  if (!result.ok) throw new Error(`profile fetch failed: ${username}`, { cause: result.cause });
  const profile = result.data;

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
