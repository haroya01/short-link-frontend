"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { request } from "@/lib/api/client";
import {
  listFeedByTag,
  listPublicFeed,
  searchPublicFeed,
  type FeedSort,
  type PublicFeedItem,
  type PublicFeedView,
} from "@/modules/blog/api/public-posts";
import { fetchPublicConnectionFeed, type ConnectionEvent } from "@/modules/blog/api/collections";
import { ConnectionFeedInsert } from "@/modules/blog/components/connection-feed-insert";
import { FeedCard, FeedList } from "@/modules/blog/components/feed-card";
import { useTagPrefs } from "@/modules/blog/lib/use-tag-prefs";
import { useViewerId, useViewerList } from "@/modules/blog/lib/use-viewer-list";

const PAGE_SIZE = 24;
// 이 시간을 넘긴 세션 스냅샷은 되살리지 않고 새로 시작한다(오래 열려 있던 탭의 낡은 피드 방지).
const RESTORE_TTL_MS = 30 * 60 * 1000;

const itemKey = (i: PublicFeedItem) => `${i.author.username}/${i.slug}`;

type FeedSnapshot = {
  items: PublicFeedItem[];
  page: number;
  hasNext: boolean;
  savedAt: number;
  viewer?: number | null;
};

// 재마운트(주로 글 상세 → 뒤로가기) 시, sessionStorage 에 저장해 둔 이 피드의 로드했던 페이지들을
// 복원한다. page 0 시드는 서버 최신본을 그대로 두고 그 뒤 tail 만 이어 붙여, 목록이 24개로 접히며
// "보던 글이 사라지는" 문제를 막는다. 복원할 게 없으면 null.
function restoreFeed(
  feedKey: string,
  seedItems: PublicFeedItem[],
  seedHasNext: boolean,
  viewer: number | null,
): { items: PublicFeedItem[]; page: number; hasNext: boolean } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(feedKey);
    if (!raw) return null;
    const snap = JSON.parse(raw) as FeedSnapshot;
    if (
      !snap ||
      !Array.isArray(snap.items) ||
      snap.items.length <= seedItems.length ||
      typeof snap.savedAt !== "number" ||
      Date.now() - snap.savedAt > RESTORE_TTL_MS ||
      (snap.viewer ?? null) !== viewer
    ) {
      return null;
    }
    const seen = new Set(seedItems.map(itemKey));
    const tail = snap.items.filter((i) => i?.author?.username && i.slug && !seen.has(itemKey(i)));
    if (tail.length === 0) return null;
    return {
      items: [...seedItems, ...tail],
      page: typeof snap.page === "number" ? snap.page : 0,
      hasNext: typeof snap.hasNext === "boolean" ? snap.hasNext : seedHasNext,
    };
  } catch {
    return null;
  }
}

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
  connectionEvents: serverConnectionEvents,
  interleaveFirst = 5,
  interleaveEvery = 5,
}: {
  locale: string;
  initialItems: PublicFeedItem[];
  initialHasNext: boolean;
  sort: FeedSort;
  query?: string;
  /** When set, paginate a single tag's feed (`?tag=`) instead of the sorted/searched feed. */
  tag?: string;
  /** Active post-language filter (ko/ja/en); undefined = all languages. Carried into page fetches. */
  lang?: string;
  connectionEvents?: ConnectionEvent[];
  interleaveFirst?: number;
  interleaveEvery?: number;
}) {
  const t = useTranslations("publicFeed");
  const { prefs } = useTagPrefs();
  // 피드 정체성: 정렬·검색·태그·언어·표면이 같으면 같은 스냅샷을 공유한다.
  const feedKey = useMemo(
    () => `kurl.feed:${locale}:${sort}:${tag ?? ""}:${lang ?? ""}:${query?.trim() ?? ""}`,
    [locale, sort, tag, lang, query],
  );

  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // 진행 중이던 loadMore 응답이 필터 전환 뒤 도착해 새 피드에 섞이지 않게 하는 세대 토큰.
  const requestGen = useRef(0);
  const viewer = useViewerId();
  const connectionEvents = useViewerList(
    serverConnectionEvents ?? [],
    () =>
      serverConnectionEvents
        ? fetchPublicConnectionFeed(0, serverConnectionEvents.length || 6).then((r) => (r.ok ? r.data.items : null))
        : Promise.resolve(null),
    "connections",
  );
  const settled = useRef<string | null>(null);

  // 시드는 서버가 익명으로 받은 page 0 이다. 누가 읽는지 정해지면 이 피드·독자에 맞춘다: 첫 마운트면
  // 같은 독자가 남긴 세션 스냅샷에서 이전 페이지들을 복원하고(하이드레이션 불일치를 피하려 상태는 SSR
  // 시드로 시작), 필터가 바뀌었으면 page 0 으로 되돌린다. 로그인 독자면 page 0 을 토큰을 실어 다시 받아
  // 바꾼다 — 서버가 그 독자가 차단·뮤트한 작가와 그 독자를 차단한 작가를 빼 준다.
  useEffect(() => {
    if (viewer === undefined) return;
    const settle = `${feedKey}|${viewer ?? ""}`;
    if (settled.current === settle) return;
    const first = settled.current === null;
    settled.current = settle;
    requestGen.current += 1;
    const gen = requestGen.current;
    const restored = first ? restoreFeed(feedKey, initialItems, initialHasNext, viewer) : null;
    setItems(restored?.items ?? initialItems);
    setPage(restored?.page ?? 0);
    setHasNext(restored?.hasNext ?? initialHasNext);
    setError(false);
    if (viewer === null) return;
    const q = query?.trim();
    const firstPage = tag
      ? listFeedByTag(tag, sort, 0, PAGE_SIZE)
      : q
        ? searchPublicFeed(q, sort, 0, PAGE_SIZE, lang)
        : listPublicFeed(sort, 0, PAGE_SIZE, lang);
    firstPage
      .then((res) => {
        if (gen !== requestGen.current || !res.ok) return;
        const fresh = res.data.items;
        const seen = new Set(fresh.map(itemKey));
        setItems((current) => [
          ...fresh,
          ...current.slice(initialItems.length).filter((i) => !seen.has(itemKey(i))),
        ]);
        if (!restored) setHasNext(res.data.hasNext);
      })
      .catch(() => {});
    // query·tag·sort·lang 은 feedKey 에 들어 있다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, feedKey, initialItems, initialHasNext]);

  // 로드한 페이지 스냅샷을 세션에 저장해 뒤로가기 복원에 쓴다. page 0(추가 로드 전)은 저장 불필요.
  // 독자를 함께 적어, 다른 독자(로그인 전후 포함)의 목록을 되살리지 않는다.
  useEffect(() => {
    if (typeof window === "undefined" || page === 0) return;
    try {
      const snapshot: FeedSnapshot = { items, page, hasNext, savedAt: Date.now(), viewer: viewer ?? null };
      window.sessionStorage.setItem(feedKey, JSON.stringify(snapshot));
    } catch {
      // 용량 초과·스토리지 비활성: 복원은 best-effort 이므로 조용히 무시한다.
    }
  }, [feedKey, items, page, hasNext, viewer]);

  const loadMore = useCallback(async () => {
    if (loading || !hasNext) return;
    setLoading(true);
    setError(false);
    const gen = requestGen.current;
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
      // 필터(정렬/태그/언어)가 바뀌었으면 이 응답은 이전 필터 것 — 새 피드에 섞지 않고 버린다.
      if (gen !== requestGen.current) return;
      // De-dupe defensively: a publish at the head between fetches can shift a post across pages.
      setItems((prev) => {
        const seen = new Set(prev.map(itemKey));
        return [...prev, ...view.items.filter((i) => !seen.has(itemKey(i)))];
      });
      setPage(next);
      setHasNext(view.hasNext);
    } catch {
      // 이전 필터의 실패는 현재 피드에 반영하지 않는다(새 피드의 오토로더를 잘못 잠그지 않도록).
      if (gen !== requestGen.current) return;
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

  // Appended rows (not in the SSR seed) fade in on mount. Identity-based (not index) so hidden-tag filtering can't
  // shift an SSR row across the boundary and replay it.
  const initialKeys = useMemo(() => new Set(initialItems.map(itemKey)), [initialItems]);

  // "보고싶은 태그만": drop posts carrying a hidden tag (per-device). The tag currently being viewed
  // is exempt, so a hidden tag's own page still shows its posts.
  const hiddenSet = new Set(prefs.hidden.filter((h) => h !== tag));
  const visible =
    hiddenSet.size === 0
      ? items
      : items.filter((i) => !i.tags?.some((tg) => hiddenSet.has(tg)));
  const hiddenCount = items.length - visible.length;

  const connectAfter = new Map<number, ConnectionEvent>();
  for (let k = 0; k < connectionEvents.length; k++) {
    const rowIdx = interleaveFirst + k * Math.max(1, interleaveEvery);
    if (rowIdx < visible.length) connectAfter.set(rowIdx, connectionEvents[k]);
  }

  return (
    <>
      <FeedList>
        {visible.map((item, i) => (
          <Fragment key={itemKey(item)}>
            <FeedCard
              item={item}
              locale={locale}
              eager={i < 4}
              entranceDelay={
                initialKeys.has(itemKey(item)) ? undefined : Math.min((i % PAGE_SIZE) * 25, 250)
              }
            />
            {connectAfter.has(i) && <ConnectionFeedInsert event={connectAfter.get(i)!} locale={locale} />}
          </Fragment>
        ))}
      </FeedList>

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
            className="inline-flex items-center gap-2 rounded-surface border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-ring disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/50"
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
