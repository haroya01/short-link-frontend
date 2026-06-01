import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Hash, PenSquare, SearchX } from "lucide-react";
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
import { FeedEmpty } from "@/modules/blog/components/feed-empty";
import { FeedInfinite } from "@/modules/blog/components/feed-infinite";
import { ReadingShell } from "@/modules/blog/components/reading-shell";
import { FollowingFeed } from "@/modules/blog/components/following-feed";
import { MobileDiscoveryStrip } from "@/modules/blog/components/mobile-discovery-strip";
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
  searchParams: Promise<{ sort?: string; q?: string }>;
}) {
  const { locale } = await params;
  const { sort: sortParam, q: qParam } = await searchParams;
  const query = (qParam ?? "").trim();
  const searching = query.length > 0;

  // "following" is client-rendered (auth needed); recent/trending are server-fetched here. A search
  // spans every author, so it only honors recent/trending — the following sort collapses to recent.
  const tab: "recent" | "trending" | "following" =
    sortParam === "trending" || sortParam === "following" ? sortParam : "recent";
  const sort: FeedSort = tab === "trending" ? "trending" : "recent";
  const activeTab = searching ? sort : tab;

  const t = await getTranslations({ locale, namespace: "publicFeed" });

  // The following tab is its own (client, auth) path with no rail; every other state shows the feed
  // body plus the desktop discovery rail.
  const showsServerFeed = searching || tab !== "following";
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
        ? searchPublicFeed(query, sort, 0, 24)
        : listPublicFeed(sort, 0, 24)
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
  // search), so the content block replays its fade instead of swapping abruptly.
  const contentKey = `${activeTab}:${searching ? query : ""}`;

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

  const browseTopicsCta = (
    <a href={blogHref("/tags")} className={blogCta({ variant: "secondary" })}>
      <Hash className="h-4 w-4 text-accent-600" />
      {t("browseTopics")}
    </a>
  );

  // tab hrefs keep the active search term on recent/trending; following leaves search.
  const sortHref = (s: FeedSort) =>
    searching ? `?q=${encodeURIComponent(query)}&sort=${s}` : `?sort=${s}`;

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

      {/* pb-24 on phones keeps the last feed card scrollable clear of the fixed write FAB (the body
          gets extra room on top of that while the cookie banner is up — see globals.css). */}
      <main className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 sm:py-8">
        <header className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 border-b border-slate-100 pb-3 dark:border-slate-800">
          <nav className="flex gap-1 text-[15px] font-bold">
            <SortTab label={t("recent")} href={sortHref("recent")} active={activeTab === "recent"} />
            <SortTab
              label={t("trending")}
              href={sortHref("trending")}
              active={activeTab === "trending"}
            />
            <SortTab
              label={t("feed")}
              href="?sort=following"
              active={!searching && tab === "following"}
              // A search spans every author, so "following" can't apply — disable the tab while a
              // query is active. The reason is shown as a visible inline note under the result
              // summary (touch-reachable), so no hover-only tooltip here.
              disabled={searching}
            />
          </nav>
        </header>

        {/* Reader's followed tags ("보고싶은 태그") — hidden until they follow one. Not during search. */}
        {!searching && <MyTagsStrip />}

        {/* Keyed by tab + query so it remounts and crossfades on each tab switch / search. */}
        <div key={contentKey} className="content-fade">
          {tab === "following" && !searching ? (
          <FollowingFeed locale={locale} suggestedAuthors={authors} />
        ) : groupByTag ? (
          trendingSections.length === 0 ? (
            <FeedEmpty title={t("emptyTitle")} body={t("emptyBody")} action={writeCta} />
          ) : (
            <ReadingShell
              className="mt-8"
              rail={
                showRail ? <DiscoveryRail locale={locale} tags={tags} authors={authors} /> : undefined
              }
            >
              <TrendingByTag
                sections={trendingSections}
                locale={locale}
                moreLabel={t("railSeeAll")}
                heading={t("trendingTopicsLabel")}
              />
            </ReadingShell>
          )
        ) : items.length === 0 ? (
          searching ? (
            <FeedEmpty
              icon={SearchX}
              title={t("searchEmptyTitle")}
              body={t("searchEmptyBody")}
              action={browseTopicsCta}
            />
          ) : (
            <FeedEmpty title={t("emptyTitle")} body={t("emptyBody")} action={writeCta} />
          )
        ) : (
          <FeedBody
            locale={locale}
            items={items}
            hasNext={hasNext}
            sort={sort}
            query={searching ? query : undefined}
            marginTop={!searching}
            featuredFirst={featuredFirst}
            featuredLabel={t("featuredLabel")}
            interleave={
              series.length > 0 ? <SeriesFeedCard series={series[0]} locale={locale} /> : null
            }
            belowFeatured={
              !searching ? (
                <MobileDiscoveryStrip locale={locale} tags={tags} authors={authors} />
              ) : null
            }
          >
            {showRail ? (
              <DiscoveryRail locale={locale} tags={tags} authors={authors} />
            ) : null}
          </FeedBody>
          )}
        </div>
      </main>
    </>
  );
}

/**
 * The feed's lead area: the infinite-scroll list (with an optional mobile discovery strip above it),
 * wrapped in the shared {@link ReadingShell} so the reading column + optional desktop rail match every
 * other blog surface. The rail (passed as `children`) sits in the right gutter at xl+.
 */
function FeedBody({
  locale,
  items,
  hasNext,
  sort,
  query,
  marginTop,
  featuredFirst,
  featuredLabel,
  interleave,
  belowFeatured,
  children,
}: {
  locale: string;
  items: PublicFeedItem[];
  hasNext: boolean;
  sort: FeedSort;
  query?: string;
  marginTop: boolean;
  featuredFirst: boolean;
  featuredLabel: string;
  interleave?: ReactNode;
  belowFeatured?: ReactNode;
  children: ReactNode;
}) {
  return (
    // The recent feed leads straight into the posts (no masthead), so a wide top gap reads as an empty
    // band under the tabs — keep it tight. Search keeps a touch more air below its masthead band.
    <ReadingShell className={marginTop ? "mt-4" : "mt-6"} rail={children}>
      {belowFeatured}
      <FeedInfinite
        locale={locale}
        initialItems={items}
        initialHasNext={hasNext}
        sort={sort}
        query={query}
        featuredFirst={featuredFirst}
        featuredLabel={featuredLabel}
        interleaveNode={interleave}
      />
    </ReadingShell>
  );
}

function SortTab({
  label,
  href,
  active,
  disabled = false,
}: {
  label: string;
  href: string;
  active: boolean;
  disabled?: boolean;
}) {
  const base = "relative px-2.5 py-1.5 transition-colors";
  // Disabled (e.g. "following" while a search is active): a non-interactive, muted span. The reason
  // is shown as the visible inline scope note, so no hover-only tooltip is needed here.
  if (disabled) {
    return (
      <span
        aria-disabled
        aria-current={active ? "page" : undefined}
        className={`${base} cursor-default text-slate-300`}
      >
        {label}
      </span>
    );
  }
  // next/link → client-side soft navigation between tabs (no full reload / flicker). The underline is
  // a keyed element (not an `after:` pseudo) so it remounts and re-plays its glide on each switch.
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${base} rounded focus-ring ${
        active
          ? "text-accent-700 dark:text-accent-400"
          : "text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
      }`}
    >
      {label}
      {active && (
        <span
          key={href}
          aria-hidden
          className="absolute inset-x-2.5 -bottom-[13px] h-0.5 origin-left rounded-full bg-accent-600 [animation:underline-glide_240ms_ease-out] motion-reduce:[animation:none]"
        />
      )}
    </Link>
  );
}
