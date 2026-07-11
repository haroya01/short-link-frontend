import type { Metadata } from "next";
import type { ReactNode } from "react";
import { routing } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { PenSquare, X } from "lucide-react";
import { blogHref } from "@/lib/host";
import { cn } from "@/lib/utils";
import { blogCta } from "./blog-cta";
import {
  listDiscoverSeries,
  listFeedByTag,
  listPopularTags,
  listPublicFeed,
  listSuggestedAuthors,
  searchPublicFeed,
  type FeedSort,
  type PublicFeedItem,
} from "../api/public-posts";
import { BlogLink } from "./blog-link";
import { FeedMasthead } from "./feed-masthead";
import { GuestMasthead } from "./guest-masthead";
import { FeedContentTransition } from "./feed-content-transition";
import { FeedSortTabs } from "./feed-sort-tabs";
import { FeedEmpty } from "./feed-empty";
import { SearchEmpty } from "./search-empty";
import { FeedInfinite } from "./feed-infinite";
import { ReadingShell } from "./reading-shell";
import { FollowingFeed } from "./following-feed";
import { ForYouFeed } from "./for-you-feed";
import { SubscribedSeriesFeed } from "./subscribed-series-feed";
import { FeedTabCookieSync } from "./feed-tab-cookie-sync";
import { DiscoverySeriesCard } from "./discovery-series-card";
import { TrendingTopics } from "./trending-topics";
import { ConnectionFeedInsert } from "./connection-feed-insert";
import { listPublicConnectionFeed } from "../api/collections";

// blog.kurl.me is its own surface — the root layout's canonical/OG point at kurl.me (the URL
// shortener), so the feed must override them or share links preview as the shortener. og:image is
// supplied by ./opengraph-image.tsx (file-based convention), so it isn't set here.
const BLOG_URL =
  process.env.NEXT_PUBLIC_BLOG_URL ??
  (process.env.NEXT_PUBLIC_BLOG_HOST
    ? `https://${process.env.NEXT_PUBLIC_BLOG_HOST}`
    : "https://blog.kurl.me");

const OG_LOCALE: Record<string, string> = { ko: "ko_KR", ja: "ja_JP", en: "en_US" };

/** Shared metadata for both feed routes — canonical stays the bare feed URL so the rewritten
 *  browse variant never indexes as a duplicate surface. */
export async function feedMetadata(locale: string): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  const url = `${BLOG_URL}/${locale}`;
  const description = t("metaDescription");
  const ogTitle = `${t("mastheadTagline")} · blog.kurl`;
  return {
    title: "blog.kurl",
    description,
    alternates: {
      canonical: url,
      // hreflang on the blog's own host — the root layout's alternates point at kurl.me, which is
      // a different site to a crawler; without these the ko/en/ja feeds index as duplicates.
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `${BLOG_URL}/${l}`])),
        "x-default": `${BLOG_URL}/${routing.defaultLocale}`,
      },
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


/**
 * The whole feed surface, shared by the two routes that serve it:
 *  - `app/[locale]/blog/page.tsx` — the bare URL, statically rendered + ISR (no params, "recent").
 *  - `app/[locale]/blog/browse/page.tsx` — the per-request variant (?sort/?q/?tag/?lang and the
 *    saved default-tab cookie), reached via the middleware rewrite so the visible URL stays /.
 * Splitting the routes is what lets the bare feed live on the edge cache: one cookies() read
 * anywhere in a route opts the entire route out of static rendering.
 */
export async function FeedScreen({
  locale,
  sortParam,
  qParam,
  langParam,
  tagParam,
}: {
  locale: string;
  sortParam?: string;
  qParam?: string;
  langParam?: string;
  tagParam?: string;
}) {
  const query = (qParam ?? "").trim();
  const searching = query.length > 0;
  // Tag filter on the discovery feed (flat grid only): clicking a card's #tag narrows to that tag.
  // Ignored during search (search already spans tags). A tag view drops the lead/series emphasis.
  const activeTag = !searching ? (tagParam ?? "").trim() : "";
  // Post-language filter (flat feed + search only); "" = all languages, the default.
  const activeLang = ["ko", "ja", "en"].includes((langParam ?? "").trim())
    ? (langParam ?? "").trim()
    : "";

  // The caller (browse route / middleware) already resolved the saved default-tab cookie into
  // sortParam; bare = "recent".
  const resolvedSort = sortParam ?? "recent";

  // "following" is client-rendered (auth needed); recent/trending are server-fetched here. A search
  // spans every author, so it only honors recent/trending — the following sort collapses to recent.
  const tab: "recent" | "trending" | "for-you" | "following" | "series" =
    resolvedSort === "trending" ||
    resolvedSort === "for-you" ||
    resolvedSort === "following" ||
    resolvedSort === "series"
      ? resolvedSort
      : "recent";
  const sort: FeedSort = tab === "trending" ? "trending" : "recent";
  const activeTab = searching ? sort : tab;

  const t = await getTranslations({ locale, namespace: "publicFeed" });

  // 발견 탭 통일: 최신·인기·검색·태그 전부 동일한 카드 그리드 프레임(폭·카드 언어 일치). 인기는
  // 인기순 정렬일 뿐 같은 그리드 — 예전 "주제별 인기 carousel"은 탭 일관성을 깨서 제거. 팔로잉/시리즈는
  // 인증이 필요한 자체 클라이언트 면(아래에서 각자 그리드로 렌더).
  const showsServerFeed =
    searching || (tab !== "following" && tab !== "series" && tab !== "for-you");
  const needFlat = showsServerFeed;
  // Series 카드는 기본(비검색·비태그) 최신 그리드에만 끼워넣는다.
  const wantSeries = !searching && !activeTag && tab === "recent";
  // "지금 이어지는 것들" — 공개 연결 이벤트를 발견 그리드(최신·인기, 비검색·비태그)에 몇 칸마다 하나씩
  // 끼운다. 비로그인 포함 전원이 첫 화면에서 연결 그래프를 밟게 하는 표면(개인화 아님).
  const wantConnections = showsServerFeed && !searching && !activeTag;
  // "지금 뜨는 주제" — 인기 탭(비검색·비필터)에서 그리드 위에 랭킹 주제 칩으로. carousel 없이 정보만.
  // 인기 탭에선 태그가 선택돼도 주제 strip 을 계속 보여준다(선택 칩만 강조) — strip 이 사라졌다 나타나며
  // 카드가 위로 점프하는 레이아웃 흔들림 방지. 선택 상태는 TrendingTopics 가 활성 칩으로 표현.
  const wantTopics = tab === "trending" && !searching;

  const [feedResult, authorsResult, seriesResult, topicsResult, connectionsResult] =
    await Promise.all([
      needFlat
        ? searching
          ? searchPublicFeed(query, sort, 0, 24, activeLang || undefined)
          : activeTag
            ? listFeedByTag(activeTag, sort, 0, 24)
            : listPublicFeed(sort, 0, 24, activeLang || undefined)
        : Promise.resolve(null),
      // 팔로잉 탭의 추천 작가(빈 상태 dead-end 방지).
      tab === "following" ? listSuggestedAuthors(5) : Promise.resolve(null),
      wantSeries ? listDiscoverSeries(4) : Promise.resolve(null),
      wantTopics ? listPopularTags(10) : Promise.resolve(null),
      // 공개 연결 이벤트(비개인화) — 발견 그리드에 몇 칸마다 하나씩. 자체 degrade(빈 배열)라 실패해도
      // 피드는 그대로 뜬다.
      wantConnections ? listPublicConnectionFeed(0, 6) : Promise.resolve(null),
    ]);

  const items = feedResult && feedResult.ok ? feedResult.data.items : [];
  const hasNext = feedResult && feedResult.ok ? feedResult.data.hasNext : false;
  // 검색이 비었을 때만 인기 주제를 한 번 더 가져온다 — SearchEmpty 의 "다른 주제 둘러보기" 칩이
  // 빈 배열로 죽어 있던 dead end 수정. 흔치 않은 경로라 순차 fetch 비용은 무시 가능.
  const emptySearchTopics =
    searching && feedResult && feedResult.ok && feedResult.data.items.length === 0
      ? await listPopularTags(8)
      : null;
  const authors = authorsResult && authorsResult.ok ? authorsResult.data : [];
  const series = seriesResult && seriesResult.ok ? seriesResult.data : [];
  const topics = topicsResult && topicsResult.ok ? topicsResult.data : [];

  // "지금 이어지는 것들" — 공개 연결 이벤트를 발견 그리드에 몇 칸마다 하나씩 끼울 노드로 만든다. 첫
  // 노드만 섹션 라벨(RailHeading)을 이고, 나머지는 행만 — 스레드가 한 번만 이름을 밝힌다. 라벨 카피는
  // collections 네임스페이스에서 서버측으로 읽어 leaf 컴포넌트에 넘긴다(클라이언트 훅 불필요).
  const tCollections = await getTranslations({ locale, namespace: "collections" });
  const connectionEvents = connectionsResult?.items ?? [];
  const connectionNodes = connectionEvents.map((event, i) => (
    <ConnectionFeedInsert
      key={event.id}
      event={event}
      locale={locale}
      lead={i === 0}
      idx={i}
      label={tCollections("connectingNow")}
    />
  ));

  // Remount key for the feed content: changes on every Latest/Popular/Following switch (and on a new
  // search), so the content block replays its slide instead of swapping abruptly.
  const contentKey = `${activeTab}:${searching ? query : ""}`;
  // Tab order drives the slide direction (FeedContentTransition): recent → trending → following.
  const tabIndex =
    activeTab === "trending"
      ? 1
      : activeTab === "for-you"
        ? 2
        : activeTab === "following"
          ? 3
          : activeTab === "series"
            ? 4
            : 0;

  // No separate hero card. On the default (non-search) recent feed the lead post just gets a quiet
  // "오늘의 글" emphasis as the first list row — same grammar as the rest of the list, only louder by a
  // notch. Trending/search feeds have no lead emphasis.
  const featuredFirst = !searching && !activeTag && tab === "recent" && items.length > 1;

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
      {/* Editorial masthead band. On search it becomes the search heading (query + scope) so the band
          reflects what you're looking at. Off search it's the quiet brand tagline — but shown to
          signed-OUT visitors only (Fork B): a first-time reader gets one line of "what this is", while
          a signed-in reader still leads straight into the posts (a quiet weblog, no marketing hero; the
          top app header already carries blog.kurl + search + write). The signed-out gate is read on the
          client (GuestMasthead/useAuth), so the home feed route stays static — no server cookies()
          that would downgrade the whole route to dynamic. */}
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
      ) : activeTag ? null : (
        // Default home landing only — a `?tag=` filtered view already states its context (#tag label),
        // so the generic tagline would just push those results down.
        <GuestMasthead />
      )}

      {/* pb-24 gives the last feed card tail room; the layout's pb-16 already clears the bottom tab
          bar, and the body gets extra room while the cookie banner is up (see globals.css).
          A <div>, not <main> — the public blog layout already owns the single <main> landmark. */}
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 sm:py-8">
        <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 border-b border-slate-100 pb-3 dark:border-slate-800 xl:max-w-5xl">
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
                key: "for-you",
                label: t("forYou"),
                href: "?sort=for-you",
                active: !searching && tab === "for-you",
                // For You is per-reader, so it can't apply to a cross-author search.
                disabled: searching,
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

        {/* Keeps the SSR default-tab cookie in step with the account pref (no UI, no redirect). */}
        <FeedTabCookieSync />

        {/* Following is its own client surface with its own rail (followed authors), so it animates as
            a whole — there's no shared discovery rail to hold still here. */}
        {tab === "for-you" && !searching ? (
          <FeedContentTransition index={tabIndex} contentKey={contentKey}>
            <ForYouFeed locale={locale} />
          </FeedContentTransition>
        ) : tab === "following" && !searching ? (
          <FeedContentTransition index={tabIndex} contentKey={contentKey}>
            <FollowingFeed locale={locale} suggestedAuthors={authors} />
          </FeedContentTransition>
        ) : tab === "series" && !searching ? (
          <FeedContentTransition index={tabIndex} contentKey={contentKey}>
            <SubscribedSeriesFeed locale={locale} />
          </FeedContentTransition>
        ) : items.length === 0 ? (
          <ReadingShell className={searching ? "mt-6" : "mt-4"}>
            <FeedContentTransition index={tabIndex} contentKey={contentKey}>
              {searching ? (
                <SearchEmpty query={query} tags={emptySearchTopics?.ok ? emptySearchTopics.data : []} locale={locale} />
              ) : (
                <FeedEmpty mark title={t("emptyTitle")} body={t("emptyBody")} action={writeCta} />
              )}
            </FeedContentTransition>
          </ReadingShell>
        ) : (
          // 최신 / 검색 결과 = 발견(browse) 면 → 와이드 메이슨리 그리드 (reading-column 예외, AGENTS.md §10.1).
          // 읽기 면(글/작가/태그)은 컬럼 유지. 사이드 rail 은 이 면에서 생략(모바일 탐색 시트가 발견을 담당).
          // xl 부터 5xl: 1440+ 에서 중앙 60%만 쓰며 허전하던 좌우를 카드 폭(3열 유지)을 키워 채운다.
          // 탭 헤더(위)도 같은 폭 — §10.1 의 "탭 밑줄이 그리드 폭과 연결" 규칙 유지.
          <div className={cn("mx-auto max-w-4xl xl:max-w-5xl", searching ? "mt-6" : "mt-4")}>
            {wantTopics && <TrendingTopics topics={topics} locale={locale} activeTag={activeTag} />}
            {/* 인기 탭(주제 strip 노출 중)에선 strip 의 활성 칩이 필터 상태를 보여주므로 별도 해제 칩은 숨김
                — 두 표시가 겹치지 않게. 최신 탭(카드 #태그 클릭) 등 strip 없는 면에선 이 칩으로 해제. */}
            {activeTag && !wantTopics && (
              // Active tag filter — always visible (no hidden filter), one click to clear.
              <div className="mb-5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-[13px] font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">
                  #{activeTag}
                  <BlogLink
                    href={`?sort=${sort}`}
                    aria-label={t("tagFilterClear")}
                    className="rounded-full transition hover:text-accent-900 dark:hover:text-accent-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </BlogLink>
                </span>
              </div>
            )}
            <FeedContentTransition index={tabIndex} contentKey={contentKey}>
              <FeedColumn
                locale={locale}
                items={items}
                hasNext={hasNext}
                sort={sort}
                tag={activeTag || undefined}
                query={searching ? query : undefined}
                lang={activeLang || undefined}
                featuredFirst={featuredFirst}
                featuredLabel={t("featuredLabel")}
                variant="grid"
                interleave={
                  series.length > 0 ? <DiscoverySeriesCard series={series[0]} locale={locale} /> : null
                }
                connectionNodes={connectionNodes.length > 0 ? connectionNodes : undefined}
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
  connectionNodes,
  variant,
  tag,
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
  connectionNodes?: ReactNode[];
  variant?: "list" | "grid";
  tag?: string;
}) {
  return (
    <FeedInfinite
      locale={locale}
      initialItems={items}
      initialHasNext={hasNext}
      sort={sort}
      query={query}
      tag={tag}
      lang={lang}
      featuredFirst={featuredFirst}
      featuredLabel={featuredLabel}
      interleaveNode={interleave}
      interleaveNodes={connectionNodes}
      variant={variant}
    />
  );
}

