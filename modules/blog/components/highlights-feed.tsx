"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { dateLocale } from "@/lib/date";
import type { FeedSource } from "@/modules/blog/api/collections";
import { getHighlightFeed, type HighlightFeedItem } from "@/modules/blog/api/highlights";
import { Avatar } from "@/modules/blog/components/avatar";
import { authorHref, postHref } from "@/modules/blog/components/feed-card";
import { quoteHref } from "@/modules/blog/components/connection-block";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";
import { blogCta } from "@/modules/blog/components/blog-cta";

const PAGE_SIZE = 20;

/**
 * "남들 하이라이트" — the follow-graph highlight feed, the web twin of the iOS Discover 하이라이트 tab:
 * passages the curators you follow recently drew, newest first. Authenticated (personalized), so it
 * fetches client-side with the access token; an anonymous viewer gets a login gate rather than a dead
 * end. Each row reuses the green left-rule quote silhouette from the connection block (so a highlight
 * reads the same across the surface) and deep-links to the source post at that sentence (`?hl=`).
 *
 * Empty (following nobody who highlights) hands the reader back to the entrances tab to find writers,
 * mirroring the iOS "연결 흐름 보기" springboard — the surface never dead-ends.
 */
export function HighlightsFeed({
  locale,
  onFindWriters,
}: {
  locale: string;
  onFindWriters: () => void;
}) {
  const t = useTranslations("collections");
  const { authenticated, ready, signInWithGoogle } = useAuth();
  const [items, setItems] = useState<HighlightFeedItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // 페이지네이션 — 첫 페이지만 받으면 초기 항목 뒤가 막다른 길이 된다. 백엔드 계약의 hasNext 를 따라
  // 팔로잉 피드와 같은 문법(무한 스크롤 + '더 보기' 버튼 폴백)으로 이어 받는다.
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  // 콜드스타트 폴백 — 팔로우 0/개인화 첫 페이지 공백이면 백엔드가 전역 스트림을 내리고 source:"global"
  // 로 알린다. 그때 이후 페이지를 scope=global 로 고정해 받아야 팔로잉↔전역이 섞이지 않는다. 구 서버는
  // source 부재(undefined) → 고정 없이 기존 동작 유지.
  const [source, setSource] = useState<FeedSource | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ready || !authenticated) return;
    let alive = true;
    setFailed(false);
    setItems(null);
    getHighlightFeed(0, PAGE_SIZE)
      .then((res) => {
        if (!alive) return;
        setItems(res.items);
        setHasNext(res.hasNext);
        setPage(0);
        setSource(res.source);
      })
      // 일시적 오류를 빈 상태로 위장하지 않는다 — 별도 오류 분기에서 '다시 시도'를 준다.
      .catch(() => alive && setFailed(true));
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
      // page 0 이 전역 폴백이었으면 이후 페이지도 scope=global 로 고정 — 안 그러면 백엔드가 페이지마다
      // 폴백 규칙을 다시 판단해 팔로잉↔전역 페이지가 섞인다(page>0 은 폴백 안 하므로 특히 위험).
      const res = await getHighlightFeed(next, PAGE_SIZE, source === "global" ? "global" : undefined);
      // 페이지 사이에 새 하이라이트가 앞에 끼면 이미 본 항목이 경계를 넘어올 수 있어 id 로 방어적 dedupe.
      setItems((prev) => {
        const seen = new Set((prev ?? []).map((h) => h.id));
        return [...(prev ?? []), ...res.items.filter((h) => !seen.has(h.id))];
      });
      setPage(next);
      setHasNext(res.hasNext);
    } catch {
      // hasNext 는 유지해 버튼이 재시도로 남게 하고, 아래 자동 로더는 loadError 로 멈춘다.
      setLoadError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasNext, page, source]);

  // 끝에 가까워지면 자동 로드; 아래 버튼은 no-JS/재시도 폴백으로 남긴다(팔로잉 피드와 같은 문법).
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

  // 비로그인 게이트 — 하이라이트 피드는 팔로우 그래프(인증 필요). 막다른 길 대신 로그인/둘러보기로.
  if (ready && !authenticated) {
    return (
      <FeedEmpty
        mark
        title={t("highlightsSignedOutTitle")}
        body={t("highlightsSignedOut")}
        action={
          <button type="button" onClick={() => signInWithGoogle()} className={blogCta()}>
            {t("highlightsSignIn")}
          </button>
        }
      />
    );
  }

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-[14px] text-slate-500 dark:text-slate-400">{t("discoverFailed")}</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className={blogCta({ variant: "secondary" })}
        >
          {t("highlightsRetry")}
        </button>
      </div>
    );
  }

  if (!ready || items === null) {
    return <HighlightsFeedSkeleton />;
  }

  if (items.length === 0) {
    return (
      <FeedEmpty
        mark
        title={t("highlightsEmptyTitle")}
        body={t("highlightsEmptyBody")}
        action={
          <button
            type="button"
            onClick={onFindWriters}
            className={blogCta({ variant: "secondary" })}
          >
            {t("highlightsEmptyCta")}
          </button>
        }
      />
    );
  }

  return (
    <div>
      {/* 콜드스타트 폴백 안내 — 팔로우가 없어 전역 하이라이트를 보여줄 때, 이게 내 팔로우 그래프가 아니라
          전역 흐름임을 조용히 한 줄로 알린다(§10: 배지·색 없이 muted 한 줄). 팔로잉이면 없음. */}
      {source === "global" && (
        <p className="mb-5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t("highlightsGlobalFallback")}
        </p>
      )}
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item, i) => (
          <li
            key={item.id}
            className="profile-fade py-6 first:pt-0"
            style={{ "--idx": Math.min(i % PAGE_SIZE, 12) } as CSSProperties}
          >
            <HighlightFeedRow item={item} locale={locale} />
          </li>
        ))}
      </ul>

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
            disabled={loadingMore}
            className={`${blogCta({ variant: "secondary" })} disabled:opacity-60`}
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("highlightsLoadingMore")}
              </>
            ) : loadError ? (
              t("highlightsRetry")
            ) : (
              t("highlightsLoadMore")
            )}
          </button>
          {loadError && !loadingMore && (
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              {t("highlightsLoadMoreError")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** One feed row — quiet curator attribution (avatar + name → profile) with the drawn-on date and any
 *  reply count, then the green-washed passage deep-linking to the source post at that sentence, the
 *  curator's margin note, and the post it lives in. Mirrors the iOS HighlightFeedCard. */
function HighlightFeedRow({ item, locale }: { item: HighlightFeedItem; locale: string }) {
  const t = useTranslations("collections");
  return (
    <article>
      {/* Who highlighted, quiet — avatar + name → their home, the drawn-on date, and any thread. */}
      <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
        {item.curator && (
          <BlogLink
            href={authorHref(item.curator.username, locale)}
            className="focus-ring group inline-flex items-center gap-2 rounded"
          >
            <Avatar src={item.curator.avatarUrl} name={item.curator.username} size="xs" />
            <span className="font-medium text-slate-700 transition-colors group-hover:text-accent-700 dark:text-slate-300 dark:group-hover:text-accent-400">
              @{item.curator.username}
            </span>
          </BlogLink>
        )}
        <span aria-hidden>·</span>
        <time dateTime={item.createdAt}>{formatDate(item.createdAt, locale)}</time>
        {item.replyCount > 0 &&
          (item.postAuthorUsername ? (
            // "답글 N" is the reader's intent (see the replies), not just a stat — so it's the entry
            // point to the conversation. It deep-links to the source post at that sentence with the
            // thread panel already open (?hl=…&thread=1). Falls back to a static count only when the
            // post author is unknown (no destination to open the thread on).
            <BlogLink
              href={`${quoteHref(item.postAuthorUsername, item.postSlug, item.quote, locale)}&thread=1`}
              className="focus-ring ml-auto rounded tabular-nums text-slate-400 transition-colors hover:text-accent-700 dark:text-slate-500 dark:hover:text-accent-400"
            >
              {t("highlightReplyCount", { count: item.replyCount })}
            </BlogLink>
          ) : (
            <span className="ml-auto tabular-nums text-slate-400 dark:text-slate-500">
              {t("highlightReplyCount", { count: item.replyCount })}
            </span>
          ))}
      </div>

      {/* The drawn passage — green left-rule quote (the connection-block silhouette), deep-linking to
          the source post at that sentence. Falls back to a plain post link when the author is unknown. */}
      {item.postAuthorUsername ? (
        <BlogLink
          href={quoteHref(item.postAuthorUsername, item.postSlug, item.quote, locale)}
          className="focus-ring group mt-2.5 flex gap-3 rounded"
        >
          <QuoteBody item={item} />
        </BlogLink>
      ) : (
        <div className="mt-2.5 flex gap-3">
          <QuoteBody item={item} />
        </div>
      )}

      {/* Which post it lives in — title · @author, a tap-through to the whole piece. */}
      {item.postAuthorUsername && (
        <BlogLink
          href={postHref(item.postAuthorUsername, item.postSlug, locale)}
          className="focus-ring group mt-2 inline-flex max-w-full items-center gap-1.5 rounded text-[12px] text-slate-400 dark:text-slate-500"
        >
          <span className="truncate font-medium text-slate-500 transition-colors group-hover:text-accent-700 dark:text-slate-400 dark:group-hover:text-accent-400">
            {item.postTitle}
          </span>
          <span aria-hidden>·</span>
          <span className="shrink-0">@{item.postAuthorUsername}</span>
        </BlogLink>
      )}

      {/* The curator's margin note, if any — the quietest line, plain on the paper. */}
      {item.note && (
        <p className="mt-2 text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
          {item.note}
        </p>
      )}
    </article>
  );
}

/** The green left-rule quote — the same silhouette a HIGHLIGHT connection block uses, so a drawn
 *  passage reads consistently wherever it appears. */
function QuoteBody({ item }: { item: HighlightFeedItem }) {
  return (
    <>
      <span
        aria-hidden
        className="mt-0.5 w-[3px] shrink-0 rounded-full bg-accent-600 dark:bg-accent-500"
      />
      <span className="min-w-0 text-[16px] leading-relaxed text-slate-800 group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-slate-100">
        {item.quote}
      </span>
    </>
  );
}

/** Loading placeholder — three rows echoing the feed rhythm (attribution → quote → post line) so the
 *  swap to real content is a settle, not a pop. Matches the connection feed's skeleton idiom. */
function HighlightsFeedSkeleton() {
  return (
    <ul aria-hidden className="animate-pulse divide-y divide-slate-100 dark:divide-slate-800">
      {[0, 1, 2].map((i) => (
        <li key={i} className="py-6 first:pt-0">
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-800" />
            <span className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="mt-3 flex gap-3">
            <span className="w-[3px] shrink-0 rounded-full bg-slate-200 dark:bg-slate-800" />
            <span className="block h-4 w-4/5 rounded bg-slate-200/90 dark:bg-slate-800/90" />
          </div>
          <span className="mt-3 block h-3 w-40 rounded bg-slate-200 dark:bg-slate-800" />
        </li>
      ))}
    </ul>
  );
}

/** House date format — month/day in the app locale, pinned to Asia/Seoul so the day never drifts by
 *  the viewer's timezone (the hydration-safe rule shared across the blog surfaces). */
function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(dateLocale(locale), {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
}
