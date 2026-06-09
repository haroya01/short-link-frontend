import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { PenSquare } from "lucide-react";
import { blogHref } from "@/lib/host";
import { cn } from "@/lib/utils";
import { blogCta } from "@/modules/blog/components/blog-cta";
import {
  listDiscoverSeries,
  listPopularTags,
  listPublicFeed,
  listSuggestedAuthors,
  listTrendingByTag,
  searchPublicFeed,
  type FeedSort,
  type PublicFeedItem,
} from "@/modules/blog/api/public-posts";
import { DiscoveryRail } from "@/modules/blog/components/discovery-rail";
import { FeedMasthead } from "@/modules/blog/components/feed-masthead";
import { FeedContentTransition } from "@/modules/blog/components/feed-content-transition";
import { FeedSortTabs } from "@/modules/blog/components/feed-sort-tabs";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";
import { SearchEmpty } from "@/modules/blog/components/search-empty";
import { FeedInfinite } from "@/modules/blog/components/feed-infinite";
import { ReadingShell } from "@/modules/blog/components/reading-shell";
import { FollowingFeed } from "@/modules/blog/components/following-feed";
import { SubscribedSeriesFeed } from "@/modules/blog/components/subscribed-series-feed";
import { MyTagsStrip } from "@/modules/blog/components/my-tags-strip";
import { SeriesFeedCard } from "@/modules/blog/components/series-feed-card";
import { TrendingByTag } from "@/modules/blog/components/trending-by-tag";

export const revalidate = 30;

// blog.kurl.me is its own surface — the root layout's canonical/OG point at kurl.me (the URL
// shortener), so the feed must override them or share links preview as the shortener. og:image is
// supplied by ./opengraph-image.tsx (file-based convention), so it isn't set here.
const BLOG_URL =
  process.env.NEXT_PUBLIC_BLOG_URL ??
  (process.env.NEXT_PUBLIC_BLOG_HOST
    ? `https://${process.env.NEXT_PUBLIC_BLOG_HOST}`
    : "https://blog.kurl.me");

const OG_LOCALE: Record<string, string> = { ko: "ko_KR", ja: "ja_JP", en: "en_US" };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  const url = `${BLOG_URL}/${locale}`;
  const description = t("metaDescription");
  const ogTitle = `${t("mastheadTagline")} · blog.kurl`;
  return {
    title: "blog.kurl",
    description,
    alternates: {
      canonical: url,
      types: { "application/rss+xml": `${BLOG_URL}/feed` },
    },
    openGraph: {
      type: "website",
      url,
      siteName: "blog.kurl",
      title: ogTitle,
      description,
      locale: OG_LOCALE[locale] ?? "en_US",
    },
    twitter: { card: "summary_large_image", title: ogTitle, description },
  };
}

export default async function BlogFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string; q?: string; lang?: string }>;
}) {
  const { locale } = await params;
  const { sort: sortParam, q: qParam, lang: langParam } = await searchParams;
  const query = (qParam ?? "").trim();
  const searching = query.length > 0;
  // Post-language filter (flat feed + search only); "" = all languages, the default.
  const activeLang = ["ko", "ja", "en"].includes((langParam ?? "").trim())
    ? (langParam ?? "").trim()
    : "";

  // "following" is client-rendered (auth needed); recent/trending are server-fetched here. A search
  // spans every author, so it only honors recent/trending — the following sort collapses to recent.
  const tab: "recent" | "trending" | "following" | "series" =
    sortParam === "trending" || sortParam === "following" || sortParam === "series"
      ? sortParam
      : "recent";
  const sort: FeedSort = tab === "trending" ? "trending" : "recent";
  const activeTab = searching ? sort : tab;

  const t = await getTranslations({ locale, namespace: "publicFeed" });

  // The following tab is its own (client, auth) path with no rail; every other state shows the feed
  // body plus the desktop discovery rail.
  const showsServerFeed = searching || (tab !== "following" && tab !== "series");
  // The 인기 tab (when not searching) is grouped into "주제별 인기" rows instead of a flat feed.
  const groupByTag = tab === "trending" && !searching;
  // Flat feed = 최신, or any search (search collapses every tab to a flat result set).
  const needFlat = showsServerFeed && !groupByTag;
  // The discovery rail (popular tags + suggested authors) rides beside both the flat feed and the
  // trending tab — 인기 used to render with an empty right gutter, which read as a layout bug.
  const needRail = needFlat || groupByTag;

  // Series cards ride only on the default recent feed (not search / trending / following) — one
  // "collection" unit dropped into the flow to surface multi-post series for discovery.
  const wantSeries = !searching && tab === "recent";

  const [feedResult, trendingResult, tagsResult, authorsResult, seriesResult] = await Promise.all([
    needFlat
      ? searching
        ? searchPublicFeed(query, sort, 0, 24, activeLang || undefined)
        : listPublicFeed(sort, 0, 24, activeLang || undefined)
      : Promise.resolve(null),
    groupByTag ? listTrendingByTag() : Promise.resolve(null),
    needRail ? listPopularTags(12) : Promise.resolve(null),
    // Authors are also the follow-suggestions for the signed-out "following" tab, so fetch them there
    // too (not just for the rail surfaces) to keep that tab from dead-ending.
    needRail || tab === "following" ? listSuggestedAuthors(5) : Promise.resolve(null),
    wantSeries ? listDiscoverSeries(4) : Promise.resolve(null),
  ]);

  const items = feedResult && feedResult.ok ? feedResult.data.items : [];
  const hasNext = feedResult && feedResult.ok ? feedResult.data.hasNext : false;
  const trendingSections = trendingResult && trendingResult.ok ? trendingResult.data : [];
  const tags = tagsResult && tagsResult.ok ? tagsResult.data : [];
  const authors = authorsResult && authorsResult.ok ? authorsResult.data : [];
  const series = seriesResult && seriesResult.ok ? seriesResult.data : [];
  const hasRail = tags.length > 0 || authors.length > 0;
  // The rail is a *browse* affordance, not a *search* one — hide it during search (desktop) to match
  // the mobile discovery strip, so a short result set isn't dominated by a sticky sidebar.
  const showRail = hasRail && !searching;

  // Remount key for the feed content: changes on every Latest/Popular/Following switch (and on a new
  // search), so the content block replays its slide instead of swapping abruptly.
  const contentKey = `${activeTab}:${searching ? query : ""}`;
  // Tab order drives the slide direction (FeedContentTransition): recent → trending → following.
  const tabIndex =
    activeTab === "trending" ? 1 : activeTab === "following" ? 2 : activeTab === "series" ? 3 : 0;

  // No separate hero card. On the default (non-search) recent feed the lead post just gets a quiet
  // "오늘의 글" emphasis as the first list row — same grammar as the rest of the list, only louder by a
  // notch. Trending/search feeds have no lead emphasis.
  const featuredFirst = !searching && tab === "recent" && items.length > 1;

  const writeCta = (
    <a href={blogHref("/write/new")} className={cn(blogCta(), "shrink-0")}>
      <PenSquare className="h-4 w-4" />
      {t("write")}
    </a>
  );

  // tab hrefs keep the active search term on recent/trending (and the language filter); following
  // leaves search.
  const langSuffix = activeLang ? `&lang=${activeLang}` : "";
  const sortHref = (s: FeedSort) =>
    searching
      ? `?q=${encodeURIComponent(query)}&sort=${s}${langSuffix}`
      : `?sort=${s}${langSuffix}`;
  return (
    <>
      {/* Editorial masthead — the brand tagline by default; on search it becomes the search heading
          (query + scope) so the band reflects what you're looking at instead of a static slogan. */}
      {/* No marketing hero on the home feed — a quiet weblog leads with the posts (the top app header
          already carries blog.kurl + search + write). The masthead band stays only for search, where
          it states what you're looking at (query + scope). */}
      {searching && (
        <FeedMasthead
          locale={locale}
          eyebrow={t("searchLabel")}
          title={
            hasNext
              ? t("searchResultsFor", { q: query })
              : t("searchResultsCount", { q: query, count: items.length })
          }
          sub={t("searchScopeAll")}
        />
      )}

      {/* pb-24 gives the last feed card tail room; the layout's pb-16 already clears the bottom tab
          bar, and the body gets extra room while the cookie banner is up (see globals.css).
          A <div>, not <main> — the public blog layout already owns the single <main> landmark. */}
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 sm:py-8">
        <header className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 border-b border-slate-100 pb-3 dark:border-slate-800">
          <FeedSortTabs
            tabs={[
              { key: "recent", label: t("recent"), href: sortHref("recent"), active: activeTab === "recent" },
              {
                key: "trending",
                label: t("trending"),
                href: sortHref("trending"),
                active: activeTab === "trending",
              },
              {
                key: "following",
                label: t("feed"),
                href: "?sort=following",
                active: !searching && tab === "following",
                // A search spans every author, so "following" can't apply — disable it while searching.
                disabled: searching,
              },
              {
                key: "series",
                label: t("seriesTab"),
                href: "?sort=series",
                active: !searching && tab === "series",
                disabled: searching,
              },
            ]}
          />
        </header>

        {/* Reader's followed tags ("보고싶은 태그") — hidden until they follow one. Not during search. */}
        {!searching && <MyTagsStrip />}

        {/* Following is its own client surface with its own rail (followed authors), so it animates as
            a whole — there's no shared discovery rail to hold still here. */}
        {tab === "following" && !searching ? (
          <FeedContentTransition index={tabIndex} contentKey={contentKey}>
            <FollowingFeed locale={locale} suggestedAuthors={authors} />
          </FeedContentTransition>
        ) : tab === "series" && !searching ? (
          <FeedContentTransition index={tabIndex} contentKey={contentKey}>
            <SubscribedSeriesFeed locale={locale} />
          </FeedContentTransition>
        ) : groupByTag ? (
          // 인기(주제별) — reading-column shell + rail, unchanged.
          <ReadingShell
            className="mt-4"
            rail={showRail ? <DiscoveryRail locale={locale} tags={tags} authors={authors} /> : undefined}
          >
            <FeedContentTransition index={tabIndex} contentKey={contentKey}>
              {trendingSections.length === 0 ? (
                <FeedEmpty mark title={t("emptyTitle")} body={t("emptyBody")} action={writeCta} />
              ) : (
                <TrendingByTag
                  sections={trendingSections}
                  locale={locale}
                  moreLabel={t("railSeeAll")}
                  heading={t("trendingTopicsLabel")}
                />
              )}
            </FeedContentTransition>
          </ReadingShell>
        ) : items.length === 0 ? (
          <ReadingShell className={searching ? "mt-6" : "mt-4"}>
            <FeedContentTransition index={tabIndex} contentKey={contentKey}>
              {searching ? (
                <SearchEmpty query={query} tags={tags} locale={locale} />
              ) : (
                <FeedEmpty mark title={t("emptyTitle")} body={t("emptyBody")} action={writeCta} />
              )}
            </FeedContentTransition>
          </ReadingShell>
        ) : (
          // 최신 / 검색 결과 = 발견(browse) 면 → 와이드 메이슨리 그리드 (reading-column 예외, AGENTS.md §10.1).
          // 읽기 면(글/작가/태그)은 컬럼 유지. 사이드 rail 은 이 면에서 생략(모바일 탐색 시트가 발견을 담당).
          <div className={cn("mx-auto max-w-6xl", searching ? "mt-6" : "mt-4")}>
            <FeedContentTransition index={tabIndex} contentKey={contentKey}>
              <FeedColumn
                locale={locale}
                items={items}
                hasNext={hasNext}
                sort={sort}
                query={searching ? query : undefined}
                lang={activeLang || undefined}
                featuredFirst={featuredFirst}
                featuredLabel={t("featuredLabel")}
                variant="grid"
                interleave={
                  series.length > 0 ? <SeriesFeedCard series={series[0]} locale={locale} /> : null
                }
              />
            </FeedContentTransition>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * The feed's reading column — the infinite-scroll post list. The surrounding {@link ReadingShell}
 * (+ the desktop rail) is rendered once by the page — NOT here — so the rail stays put while only this
 * column slides on a tab switch. Mobile discovery (tags / authors) lives in the 탐색 sheet now, not
 * above the feed.
 */
function FeedColumn({
  locale,
  items,
  hasNext,
  sort,
  query,
  lang,
  featuredFirst,
  featuredLabel,
  interleave,
  variant,
}: {
  locale: string;
  items: PublicFeedItem[];
  hasNext: boolean;
  sort: FeedSort;
  query?: string;
  lang?: string;
  featuredFirst: boolean;
  featuredLabel: string;
  interleave?: ReactNode;
  variant?: "list" | "grid";
}) {
  return (
    <FeedInfinite
      locale={locale}
      initialItems={items}
      initialHasNext={hasNext}
      sort={sort}
      query={query}
      lang={lang}
      featuredFirst={featuredFirst}
      featuredLabel={featuredLabel}
      interleaveNode={interleave}
      variant={variant}
    />
  );
}

