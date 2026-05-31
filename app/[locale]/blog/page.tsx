import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Hash, PenSquare, SearchX } from "lucide-react";
import { blogHref } from "@/lib/host";
import { cn } from "@/lib/utils";
import { blogCta } from "@/modules/blog/components/blog-cta";
import {
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
import { FeedFeaturedCard } from "@/modules/blog/components/feed-card";
import { FeedInfinite } from "@/modules/blog/components/feed-infinite";
import { FollowingFeed } from "@/modules/blog/components/following-feed";
import { MobileDiscoveryStrip } from "@/modules/blog/components/mobile-discovery-strip";
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
    alternates: { canonical: url },
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

  const [feedResult, trendingResult, tagsResult, authorsResult] = await Promise.all([
    needFlat
      ? searching
        ? searchPublicFeed(query, sort, 0, 24)
        : listPublicFeed(sort, 0, 24)
      : Promise.resolve(null),
    groupByTag ? listTrendingByTag() : Promise.resolve(null),
    needFlat ? listPopularTags(12) : Promise.resolve(null),
    // Authors are also the follow-suggestions for the signed-out "following" tab, so fetch them there
    // too (not just for the flat feed) to keep that tab from dead-ending.
    needFlat || tab === "following" ? listSuggestedAuthors(5) : Promise.resolve(null),
  ]);

  const items = feedResult && feedResult.ok ? feedResult.data.items : [];
  const hasNext = feedResult && feedResult.ok ? feedResult.data.hasNext : false;
  const trendingSections = trendingResult && trendingResult.ok ? trendingResult.data : [];
  const tags = tagsResult && tagsResult.ok ? tagsResult.data : [];
  const authors = authorsResult && authorsResult.ok ? authorsResult.data : [];
  const hasRail = tags.length > 0 || authors.length > 0;
  // The rail is a *browse* affordance, not a *search* one — hide it during search (desktop) to match
  // the mobile discovery strip, so a short result set isn't dominated by a sticky sidebar.
  const showRail = hasRail && !searching;

  const labels = { views: (count: number) => t("views", { count }) };

  // Remount key for the feed content: changes on every Latest/Popular/Following switch (and on a new
  // search), so the content block replays its fade instead of swapping abruptly.
  const contentKey = `${activeTab}:${searching ? query : ""}`;

  // Editorial focal point: promote the lead post to a wide featured card on the default (non-search)
  // feed — but only when (a) enough posts remain to fill a grid beneath it, and (b) the lead post has
  // a real cover image. A featured slot is the page's single focal point; filling it with the flat
  // monochrome fallback cover would make the hero read as an empty placeholder, so a coverless lead
  // post just flows into the normal grid instead.
  const useFeatured = !searching && items.length > 3 && Boolean(items[0].ogImageUrl);
  const featured = useFeatured ? (
    <FeedFeaturedCard
      item={items[0]}
      locale={locale}
      labels={labels}
      featuredLabel={t("featuredLabel")}
    />
  ) : null;
  const gridItems = useFeatured ? items.slice(1) : items;

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
      {searching ? (
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
      ) : (
        <FeedMasthead locale={locale} />
      )}

      {/* pb-24 on phones keeps the last feed card scrollable clear of the fixed write FAB (the body
          gets extra room on top of that while the cookie banner is up — see globals.css). */}
      <main className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
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
          <div className="hidden sm:block">{writeCta}</div>
        </header>


        {/* Keyed by tab + query so it remounts and crossfades on each tab switch / search. */}
        <div key={contentKey} className="content-fade">
          {/* Phone-only discovery: the desktop rail (lg+) is absent on small screens, so surface tags
              and authors here above the feed when browsing (not while searching or on the following tab). */}
          {!searching && tab !== "following" && items.length > 0 && (
            <MobileDiscoveryStrip locale={locale} tags={tags} authors={authors} />
          )}

          {tab === "following" && !searching ? (
          <FollowingFeed locale={locale} suggestedAuthors={authors} />
        ) : groupByTag ? (
          trendingSections.length === 0 ? (
            <FeedEmpty title={t("emptyTitle")} body={t("emptyBody")} action={writeCta} />
          ) : (
            <TrendingByTag
              sections={trendingSections}
              locale={locale}
              labels={labels}
              moreLabel={t("railSeeAll")}
              heading={t("trendingTopicsLabel")}
            />
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
            items={gridItems}
            hasNext={hasNext}
            sort={sort}
            query={searching ? query : undefined}
            hasRail={showRail}
            marginTop={!searching}
            featured={featured}
          >
            {showRail ? (
              <DiscoveryRail locale={locale} tags={tags} authors={authors} />
            ) : null}
          </FeedBody>
          )}
        </div>
      </main>

      {/* Mobile-only floating write button — the header Write CTA is desktop-only (sm:block), so
          on phones the action lives here as a FAB (velog-style). */}
      <a
        href={blogHref("/write/new")}
        aria-label={t("write")}
        style={{ bottom: "var(--fab-bottom, 1.5rem)" }}
        className="fixed right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-600 text-white shadow-[0_8px_24px_-6px_rgba(5,150,105,0.5)] transition-[bottom,background-color] duration-200 hover:bg-accent-700 focus-ring motion-reduce:transition-none sm:hidden"
      >
        <PenSquare className="h-5 w-5" />
      </a>
    </>
  );
}

/**
 * The feed's lead area: an optional wide featured card stacked above the infinite-scroll grid, plus
 * the optional desktop rail. With a rail the cards cap at 3 columns (the rail eats the 4th); without
 * one they fall back to the standard 4-up grid so a rail-less feed isn't narrow.
 */
function FeedBody({
  locale,
  items,
  hasNext,
  sort,
  query,
  hasRail,
  marginTop,
  featured,
  children,
}: {
  locale: string;
  items: PublicFeedItem[];
  hasNext: boolean;
  sort: FeedSort;
  query?: string;
  hasRail: boolean;
  marginTop: boolean;
  featured: ReactNode;
  children: ReactNode;
}) {
  const grid = (
    <>
      {featured && <div className="mb-10 sm:mb-12">{featured}</div>}
      <FeedInfinite
        locale={locale}
        initialItems={items}
        initialHasNext={hasNext}
        sort={sort}
        query={query}
        hasRail={hasRail}
      />
    </>
  );

  const top = marginTop ? "mt-8" : "mt-6";

  if (!hasRail) return <div className={top}>{grid}</div>;

  return (
    <div className={`${top} lg:grid lg:grid-cols-[minmax(0,1fr)_clamp(240px,22vw,300px)] lg:items-start lg:gap-10`}>
      <div>{grid}</div>
      {/* Sticky so the discovery rail stays present while the reader scrolls the feed — a more
          useful presence without making it visually louder than the content. */}
      <aside className="mt-12 hidden lg:sticky lg:top-20 lg:mt-0 lg:block">{children}</aside>
    </div>
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
      <span aria-disabled className={`${base} cursor-default text-slate-300`}>
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
        active ? "text-accent-700" : "text-slate-400 hover:text-slate-700"
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
