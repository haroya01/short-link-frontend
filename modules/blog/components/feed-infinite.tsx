"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { request } from "@/lib/api/client";
import type { FeedSort, PublicFeedItem, PublicFeedView } from "@/modules/blog/api/public-posts";
import { FeedCard, FeedList } from "@/modules/blog/components/feed-card";
import { DiscoveryCard, DiscoveryGrid, DiscoveryCell } from "@/modules/blog/components/discovery-card";
import { useTagPrefs } from "@/modules/blog/lib/use-tag-prefs";

const PAGE_SIZE = 24;

const itemKey = (i: PublicFeedItem) => `${i.author.username}/${i.slug}`;

/**
 * Client-side continuation of the feed: the first page is server-rendered (SSR/ISR) and handed in as
 * {@link initialItems}; this appends later pages as the reader nears the end (IntersectionObserver),
 * with a "load more" button as the no-JS / retry fallback. A sort or search change re-renders the
 * server component with a fresh initial set, which resets the list here.
 */
export function FeedInfinite({
  locale,
  initialItems,
  initialHasNext,
  sort,
  query,
  tag,
  lang,
  featuredFirst = false,
  featuredLabel,
  interleaveNode,
  interleaveAfter = 3,
  variant = "list",
}: {
  locale: string;
  initialItems: PublicFeedItem[];
  initialHasNext: boolean;
  sort: FeedSort;
  query?: string;
  /** "list" = the reading-column post list (default, used by author/tag/following surfaces).
   *  "grid" = the discovery masonry of {@link DiscoveryCard} (blog home 최신 / 검색 — browse surface). */
  variant?: "list" | "grid";
  /** When set, paginate a single tag's feed (`?tag=`) instead of the sorted/searched feed. */
  tag?: string;
  /** Active post-language filter (ko/ja/en); undefined = all languages. Carried into page fetches. */
  lang?: string;
  /** Accepted for call-site compatibility; the single-column list no longer varies by rail. */
  hasRail?: boolean;
  /** Give the very first item a quiet editorial emphasis (the recent home feed's lead post). */
  featuredFirst?: boolean;
  /** Label for the featured lead row (e.g. "오늘의 글"). */
  featuredLabel?: string;
  /** A non-post block (e.g. a series card) dropped into the feed after {@link interleaveAfter} rows.
   *  Only shown when the feed has rows past that point, so it never trails a short feed. */
  interleaveNode?: ReactNode;
  /** Zero-based row index the interleaved node is inserted after (default: after the 4th row). */
  interleaveAfter?: number;
}) {
  const t = useTranslations("publicFeed");
  const { prefs } = useTagPrefs();
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // A new server render (tab switch / new search) replaces the seed — reset to its page 0.
  useEffect(() => {
    setItems(initialItems);
    setPage(0);
    setHasNext(initialHasNext);
    setError(false);
  }, [initialItems, initialHasNext]);

  const loadMore = useCallback(async () => {
    if (loading || !hasNext) return;
    setLoading(true);
    setError(false);
    const next = page + 1;
    const q = query?.trim();
    const langSuffix = lang ? `&lang=${encodeURIComponent(lang)}` : "";
    const path = tag
      ? `/api/v1/public/posts?tag=${encodeURIComponent(tag)}&sort=${sort}&page=${next}&size=${PAGE_SIZE}`
      : q
        ? `/api/v1/public/posts?q=${encodeURIComponent(q)}&sort=${sort}&page=${next}&size=${PAGE_SIZE}${langSuffix}`
        : `/api/v1/public/posts?sort=${sort}&page=${next}&size=${PAGE_SIZE}${langSuffix}`;
    try {
      const view = await request<PublicFeedView>(path, { method: "GET" });
      // De-dupe defensively: a publish at the head between fetches can shift a post across pages.
      setItems((prev) => {
        const seen = new Set(prev.map(itemKey));
        return [...prev, ...view.items.filter((i) => !seen.has(itemKey(i)))];
      });
      setPage(next);
      setHasNext(view.hasNext);
    } catch {
      // Surface a retry instead of silently ending the feed. `hasNext` stays true so the button
      // remains; `error` gates the auto-loader below so the observer doesn't spin on a broken fetch.
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [loading, hasNext, page, query, sort, tag, lang]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNext || error) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNext, error, loadMore]);

  // "보고싶은 태그만": drop posts carrying a hidden tag (per-device). The tag currently being viewed
  // is exempt, so a hidden tag's own page still shows its posts. Featured stays pinned to index 0.
  const hiddenSet = new Set(prefs.hidden.filter((h) => h !== tag));
  const visible =
    hiddenSet.size === 0
      ? items
      : items.filter((i) => !i.tags?.some((tg) => hiddenSet.has(tg)));
  const hiddenCount = items.length - visible.length;

  return (
    <>
      {variant === "grid" ? (
        // Browse surface — 전 뷰포트 카드 그리드(타일 = 사진 cover 또는 흰 타이포 카드). 모바일은
        // DiscoveryGrid 의 1열: 예전의 "모바일 = 리스트 행" 분기는 2열 타일의 제목 잘림·masonry
        // 재배치 점프 때문이었는데, 1열 카드는 둘 다 없어서(전폭 제목, 끝에만 append) 카드 문법을
        // 그대로 내려보낼 수 있다 — 두 DOM 트리(md:hidden 페어)도 함께 사라졌다.
        <DiscoveryGrid>
          {visible.map((item, i) => (
            <Fragment key={itemKey(item)}>
              {/* 페이지 청크 안 순서(i % size)대로 25ms 스태거 — append 된 카드만 새로 마운트되므로
                  기존 카드는 다시 돌지 않고, 새 페이지가 "뚝"이 아니라 줄지어 떠오른다. */}
              <DiscoveryCell entranceDelay={Math.min((i % PAGE_SIZE) * 25, 250)}>
                <DiscoveryCard item={item} locale={locale} featured={featuredFirst && i === 0} eager={i < 4} />
              </DiscoveryCell>
              {interleaveNode && i === interleaveAfter && visible.length > interleaveAfter + 1 && (
                <DiscoveryCell>{interleaveNode}</DiscoveryCell>
              )}
            </Fragment>
          ))}
        </DiscoveryGrid>
      ) : (
        <FeedList>
          {visible.map((item, i) => (
            <Fragment key={itemKey(item)}>
              <FeedCard
                item={item}
                locale={locale}
                featured={featuredFirst && i === 0}
                featuredLabel={featuredLabel}
                eager={i < 4}
              />
              {interleaveNode && i === interleaveAfter && visible.length > interleaveAfter + 1 && (
                // Bracketed by rules top + bottom so the series block reads as a distinct insert in
                // the feed flow, not just another post row.
                <li className="list-none border-y border-slate-200 py-3.5 dark:border-slate-700">
                  {interleaveNode}
                </li>
              )}
            </Fragment>
          ))}
        </FeedList>
      )}

      {hiddenCount > 0 && (
        <p className="mt-4 text-center text-[12px] text-slate-500 dark:text-slate-400">
          {t("tagHiddenCount", { count: hiddenCount })}
        </p>
      )}

      {hasNext && (
        <div
          ref={sentinelRef}
          role="status"
          aria-live="polite"
          className="mt-8 flex flex-col items-center gap-2"
        >
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-ring disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loadingMore")}
              </>
            ) : error ? (
              t("retry")
            ) : (
              t("loadMore")
            )}
          </button>
          {error && !loading && (
            <p className="text-[12px] text-slate-500 dark:text-slate-400">{t("loadMoreError")}</p>
          )}
        </div>
      )}
    </>
  );
}
