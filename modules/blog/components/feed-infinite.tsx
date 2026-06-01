"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { request } from "@/lib/api/client";
import type { FeedSort, PublicFeedItem, PublicFeedView } from "@/modules/blog/api/public-posts";
import { FeedCard, FeedList } from "@/modules/blog/components/feed-card";
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
  featuredFirst = false,
  featuredLabel,
}: {
  locale: string;
  initialItems: PublicFeedItem[];
  initialHasNext: boolean;
  sort: FeedSort;
  query?: string;
  /** When set, paginate a single tag's feed (`?tag=`) instead of the sorted/searched feed. */
  tag?: string;
  /** Accepted for call-site compatibility; the single-column list no longer varies by rail. */
  hasRail?: boolean;
  /** Give the very first item a quiet editorial emphasis (the recent home feed's lead post). */
  featuredFirst?: boolean;
  /** Label for the featured lead row (e.g. "오늘의 글"). */
  featuredLabel?: string;
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
    const path = tag
      ? `/api/v1/public/posts?tag=${encodeURIComponent(tag)}&sort=${sort}&page=${next}&size=${PAGE_SIZE}`
      : q
        ? `/api/v1/public/posts?q=${encodeURIComponent(q)}&sort=${sort}&page=${next}&size=${PAGE_SIZE}`
        : `/api/v1/public/posts?sort=${sort}&page=${next}&size=${PAGE_SIZE}`;
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
  }, [loading, hasNext, page, query, sort, tag]);

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
      <FeedList>
        {visible.map((item, i) => (
          <FeedCard
            key={itemKey(item)}
            item={item}
            locale={locale}
            featured={featuredFirst && i === 0}
            featuredLabel={featuredLabel}
          />
        ))}
      </FeedList>

      {hiddenCount > 0 && (
        <p className="mt-4 text-center text-[12px] text-slate-400 dark:text-slate-500">
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
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-ring disabled:opacity-60"
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
            <p className="text-[12px] text-slate-400">{t("loadMoreError")}</p>
          )}
        </div>
      )}
    </>
  );
}
