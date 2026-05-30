"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { request } from "@/lib/api/client";
import type { FeedSort, PublicFeedItem, PublicFeedView } from "@/modules/blog/api/public-posts";
import { FeedCard, FeedGrid } from "@/modules/blog/components/feed-card";

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
  hasRail,
}: {
  locale: string;
  initialItems: PublicFeedItem[];
  initialHasNext: boolean;
  sort: FeedSort;
  query?: string;
  /** When set, paginate a single tag's feed (`?tag=`) instead of the sorted/searched feed. */
  tag?: string;
  hasRail: boolean;
}) {
  const t = useTranslations("publicFeed");
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

  return (
    <>
      <FeedGrid hasRail={hasRail}>
        {items.map((item) => (
          <FeedCard
            key={itemKey(item)}
            item={item}
            locale={locale}
            labels={{ views: (count) => t("views", { count }) }}
          />
        ))}
      </FeedGrid>

      {hasNext && (
        <div ref={sentinelRef} className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
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
