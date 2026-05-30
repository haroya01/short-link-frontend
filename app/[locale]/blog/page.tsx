import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Hash, PenSquare } from "lucide-react";
import { blogHref } from "@/lib/host";
import {
  listPopularTags,
  listPublicFeed,
  listSuggestedAuthors,
  searchPublicFeed,
  type FeedSort,
  type PublicFeedItem,
} from "@/modules/blog/api/public-posts";
import { DiscoveryRail } from "@/modules/blog/components/discovery-rail";
import { FeedHero } from "@/modules/blog/components/feed-hero";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";
import { FeedInfinite } from "@/modules/blog/components/feed-infinite";
import { FollowingFeed } from "@/modules/blog/components/following-feed";
import { MobileDiscoveryStrip } from "@/modules/blog/components/mobile-discovery-strip";

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
  const description = t("heroSubhead");
  const ogTitle = `${t("heroTitle")} · blog.kurl`;
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

  const [feedResult, tagsResult, authorsResult] = await Promise.all([
    !showsServerFeed
      ? Promise.resolve(null)
      : searching
        ? searchPublicFeed(query, sort, 0, 24)
        : listPublicFeed(sort, 0, 24),
    showsServerFeed ? listPopularTags(12) : Promise.resolve(null),
    // Authors are also the follow-suggestions for the signed-out "following" tab, so fetch them there
    // too (not just for the server feed) to keep that tab from dead-ending.
    showsServerFeed || tab === "following"
      ? listSuggestedAuthors(5)
      : Promise.resolve(null),
  ]);

  const items = feedResult && feedResult.ok ? feedResult.data.items : [];
  const hasNext = feedResult && feedResult.ok ? feedResult.data.hasNext : false;
  const tags = tagsResult && tagsResult.ok ? tagsResult.data : [];
  const authors = authorsResult && authorsResult.ok ? authorsResult.data : [];
  const hasRail = tags.length > 0 || authors.length > 0;

  const writeCta = (
    <a
      href={blogHref("/write/new")}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(5,150,105,0.45)] transition-colors hover:bg-accent-700"
    >
      <PenSquare className="h-4 w-4" />
      {t("write")}
    </a>
  );

  const browseTopicsCta = (
    <a
      href={blogHref("/tags")}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <Hash className="h-4 w-4 text-accent-600" />
      {t("browseTopics")}
    </a>
  );

  // tab hrefs keep the active search term on recent/trending; following & topics leave search.
  const sortHref = (s: FeedSort) =>
    searching ? `?q=${encodeURIComponent(query)}&sort=${s}` : `?sort=${s}`;

  return (
    <>
      {/* Auth-adaptive hero — marketing pitch for visitors, a compact author dashboard for the
          signed-in writer (client-resolved). Same shell as the showcase & landing heroes, so
          blog.kurl reads as part of kurl rather than a bare tab bar on white. */}
      <FeedHero locale={locale} />

      {/* pb-24 on phones keeps the last feed card scrollable clear of the fixed write FAB (the body
          gets extra room on top of that while the cookie banner is up — see globals.css). */}
      <main className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 sm:py-8">
        {/* Tabs lead the feed — browsing, not searching. Search lives in the global header (🔍),
            reachable from every blog page rather than trapped here. Write is the author action, kept
            distinct: desktop CTA on the right, mobile FAB below. */}
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
            />
          </nav>
          <div className="hidden sm:block">{writeCta}</div>
        </header>

        {searching && (
          <p className="mt-6 text-[14px] text-slate-500">
            {t("searchResultsFor", { q: query })}
          </p>
        )}

        {/* Phone-only discovery: the desktop rail (lg+) is absent on small screens, so surface tags
            and authors here above the feed when browsing (not while searching or on the following tab). */}
        {!searching && tab !== "following" && items.length > 0 && (
          <MobileDiscoveryStrip locale={locale} tags={tags} authors={authors} />
        )}

        {tab === "following" && !searching ? (
          <FollowingFeed locale={locale} suggestedAuthors={authors} />
        ) : items.length === 0 ? (
          searching ? (
            <FeedEmpty
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
            hasRail={hasRail}
            marginTop={!searching}
          >
            {hasRail ? (
              <DiscoveryRail locale={locale} tags={tags} authors={authors} />
            ) : null}
          </FeedBody>
        )}
      </main>

      {/* Mobile-only floating write button — the header Write CTA is desktop-only (sm:block), so
          on phones the action lives here as a FAB (velog-style). */}
      <a
        href={blogHref("/write/new")}
        aria-label={t("write")}
        style={{ bottom: "var(--fab-bottom, 1.5rem)" }}
        className="fixed right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-600 text-white shadow-[0_8px_24px_-6px_rgba(5,150,105,0.5)] transition-[bottom,background-color] duration-200 hover:bg-accent-700 sm:hidden"
      >
        <PenSquare className="h-5 w-5" />
      </a>
    </>
  );
}

/**
 * Feed cards plus the optional desktop rail. With a rail the cards cap at 3 columns (the rail eats
 * the 4th); without one they fall back to the standard 4-up grid so a rail-less feed isn't narrow.
 */
function FeedBody({
  locale,
  items,
  hasNext,
  sort,
  query,
  hasRail,
  marginTop,
  children,
}: {
  locale: string;
  items: PublicFeedItem[];
  hasNext: boolean;
  sort: FeedSort;
  query?: string;
  hasRail: boolean;
  marginTop: boolean;
  children: ReactNode;
}) {
  const grid = (
    <FeedInfinite
      locale={locale}
      initialItems={items}
      initialHasNext={hasNext}
      sort={sort}
      query={query}
      hasRail={hasRail}
    />
  );

  const top = marginTop ? "mt-8" : "mt-6";

  if (!hasRail) return <div className={top}>{grid}</div>;

  return (
    <div className={`${top} lg:grid lg:grid-cols-[minmax(0,1fr)_clamp(240px,22vw,300px)] lg:gap-10`}>
      <div>{grid}</div>
      <aside className="mt-12 hidden lg:mt-0 lg:block">{children}</aside>
    </div>
  );
}

function SortTab({ label, href, active }: { label: string; href: string; active: boolean }) {
  // next/link → client-side soft navigation between tabs (no full reload / flicker).
  return (
    <Link
      href={href}
      className={`relative px-2.5 py-1.5 transition-colors ${
        active
          ? "text-accent-700 after:absolute after:inset-x-2.5 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-accent-600"
          : "text-slate-400 hover:text-slate-700"
      }`}
    >
      {label}
    </Link>
  );
}
