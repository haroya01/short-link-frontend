"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { listForYouFeed } from "@/modules/blog/api/follows";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";
import { FeedCard, FeedList, FeedListSkeleton } from "@/modules/blog/components/feed-card";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";
import { SuggestedCurators } from "@/modules/blog/components/suggested-curators";
import { blogCta } from "@/modules/blog/components/blog-cta";

/**
 * The "For You" tab — a personalized discovery feed (tag affinity). Auth is required (the ranking is
 * per-reader); a signed-out visitor gets a sign-in prompt. Signed in, the server cold-starts to
 * trending, so the list is never empty for a new reader. Cards carry a 왜-추천 tag chip (followReason),
 * rendered by FeedCard just like the following feed.
 */
export function ForYouFeed({ locale }: { locale: string }) {
  const t = useTranslations("publicFeed");
  const { authenticated, ready, signInWithGoogle } = useAuth();
  const [items, setItems] = useState<PublicFeedItem[] | null>(null);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // 첫 로드 실패는 '빈 피드'와 구분한다(아래 initialError 분기) — reloadKey 를 올리면 이펙트가 다시 돈다.
  const [initialError, setInitialError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ready || !authenticated) return;
    let alive = true;
    setInitialError(false);
    setItems(null);
    listForYouFeed(0, 24)
      .then((view) => {
        if (!alive) return;
        setItems(view.items);
        setHasNext(view.hasNext);
        setPage(0);
      })
      .catch(() => {
        // 일시적 오류를 빈 상태로 위장하지 않는다 — 별도 오류 분기에서 '다시 시도'를 준다.
        if (alive) setInitialError(true);
      });
    return () => {
      alive = false;
    };
  }, [ready, authenticated, reloadKey]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasNext) return;
    setLoadingMore(true);
    setLoadError(false);
    const next = page + 1;
    try {
      const view = await listForYouFeed(next, 24);
      setItems((prev) => {
        const seen = new Set((prev ?? []).map((i) => `${i.author.username}/${i.slug}`));
        return [...(prev ?? []), ...view.items.filter((i) => !seen.has(`${i.author.username}/${i.slug}`))];
      });
      setPage(next);
      setHasNext(view.hasNext);
    } catch {
      setLoadError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasNext, page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNext || loadError) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNext, loadError, loadMore]);

  if (ready && !authenticated) {
    return (
      <div className="mt-8">
        <FeedEmpty
          mark
          title={t("forYouSignedOutTitle")}
          body={t("forYouSignedOut")}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button type="button" onClick={() => signInWithGoogle()} className={blogCta()}>
                {t("signIn")}
              </button>
              <Link href="?sort=recent" className={blogCta({ variant: "secondary" })}>
                {t("followingBrowseLatest")}
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  if (initialError) {
    return (
      <div className="mt-4 flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-[14px] text-slate-500 dark:text-slate-400">{t("loadMoreError")}</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-ring dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/50"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  if (!ready || items === null) {
    return (
      <div className="mx-auto mt-4 max-w-2xl">
        <FeedListSkeleton />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-4">
        <FeedEmpty
          mark
          title={t("forYouEmptyTitle")}
          body={t("forYouEmpty")}
          action={
            <Link href="?sort=recent" className={blogCta({ variant: "secondary" })}>
              {t("followingBrowseLatest")}
            </Link>
          }
        >
          {/* Cold-start: For You can't personalize without follows — seed the graph with curators. */}
          <SuggestedCurators locale={locale} />
        </FeedEmpty>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-4 max-w-2xl animate-fade-in">
      <FeedList>
        {items.map((item) => (
          <FeedCard key={`${item.author.username}/${item.slug}`} item={item} locale={locale} />
        ))}
      </FeedList>

      {hasNext && (
        <div ref={sentinelRef} role="status" aria-live="polite" className="mt-8 flex flex-col items-center gap-2">
          <button type="button" onClick={loadMore} disabled={loadingMore} className={blogCta({ variant: "secondary" })}>
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : t("loadMore")}
          </button>
          {loadError && <span className="text-[13px] text-rose-600 dark:text-rose-400">{t("loadMoreError")}</span>}
        </div>
      )}
    </div>
  );
}
