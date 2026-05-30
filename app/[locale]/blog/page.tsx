import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
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
import { FeedCard } from "@/modules/blog/components/feed-card";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";
import { FeedSearch } from "@/modules/blog/components/feed-search";
import { FollowingFeed } from "@/modules/blog/components/following-feed";

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
    showsServerFeed ? listSuggestedAuthors(5) : Promise.resolve(null),
  ]);

  const items = feedResult && feedResult.ok ? feedResult.data.items : [];
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
      {/* Identity hero — same restrained eyebrow / headline / subhead treatment as the showcase &
          landing heroes, so blog.kurl reads as part of kurl rather than a bare tab bar on white. */}
      <section className="border-b border-slate-200/70 bg-gradient-to-b from-accent-50/50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="hero-stagger max-w-2xl space-y-3">
            <p
              className="font-mono text-[11px] uppercase tracking-tagline text-accent-700"
              style={{ ["--hi" as string]: 0 } as CSSProperties}
            >
              {t("heroEyebrow")}
            </p>
            <h1
              className="text-balance text-[30px] font-semibold leading-[1.1] tracking-headline text-slate-900 sm:text-[40px]"
              style={{ ["--hi" as string]: 1 } as CSSProperties}
            >
              {t("heroTitle")}
            </h1>
            <p
              className="max-w-md text-balance text-[15px] leading-relaxed text-slate-500"
              style={{ ["--hi" as string]: 2 } as CSSProperties}
            >
              {t("heroSubhead")}
            </p>
          </div>
        </div>
      </section>

      {/* pb-24 on phones keeps the last feed card scrollable clear of the fixed write FAB (the body
          gets extra room on top of that while the cookie banner is up — see globals.css). */}
      <main className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 sm:py-8">
        {/* Control bar: search spans the row, Write sits at the right on desktop (phones use the FAB).
            Search reads "browse all posts"; the tabs below are sort/filter — so search leads. */}
        <div className="flex items-center gap-3">
          <FeedSearch initialQuery={query} />
          <div className="ml-auto hidden sm:block">{writeCta}</div>
        </div>

        <header className="mt-4 flex items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
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
            <SortTab label={t("topics")} href={blogHref("/tags")} active={false} />
          </nav>
        </header>

        {searching && (
          <p className="mt-6 text-[14px] text-slate-500">
            {t("searchResultsFor", { q: query })}
          </p>
        )}

        {tab === "following" && !searching ? (
          <FollowingFeed locale={locale} />
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
          <FeedBody locale={locale} items={items} t={t} hasRail={hasRail} marginTop={!searching}>
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
  t,
  hasRail,
  marginTop,
  children,
}: {
  locale: string;
  items: PublicFeedItem[];
  t: Awaited<ReturnType<typeof getTranslations>>;
  hasRail: boolean;
  marginTop: boolean;
  children: ReactNode;
}) {
  const grid = (
    <ul
      className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${
        hasRail ? "xl:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4"
      }`}
    >
      {items.map((item) => (
        <FeedCard
          key={`${item.author.username}/${item.slug}`}
          item={item}
          locale={locale}
          labels={{ views: (count) => t("views", { count }) }}
        />
      ))}
    </ul>
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
