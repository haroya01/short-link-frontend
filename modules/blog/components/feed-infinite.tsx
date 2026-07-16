"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { request } from "@/lib/api/client";
import type { FeedSort, PublicFeedItem, PublicFeedView } from "@/modules/blog/api/public-posts";
import { FeedCard, FeedList } from "@/modules/blog/components/feed-card";
import { DiscoveryCard, DiscoveryGrid, DiscoveryCell } from "@/modules/blog/components/discovery-card";
import { useTagPrefs } from "@/modules/blog/lib/use-tag-prefs";

const PAGE_SIZE = 24;
// 이 시간을 넘긴 세션 스냅샷은 되살리지 않고 새로 시작한다(오래 열려 있던 탭의 낡은 피드 방지).
const RESTORE_TTL_MS = 30 * 60 * 1000;

const itemKey = (i: PublicFeedItem) => `${i.author.username}/${i.slug}`;

type FeedSnapshot = { items: PublicFeedItem[]; page: number; hasNext: boolean; savedAt: number };

// 재마운트(주로 글 상세 → 뒤로가기) 시, sessionStorage 에 저장해 둔 이 피드의 로드했던 페이지들을
// 복원한다. page 0 시드는 서버 최신본을 그대로 두고 그 뒤 tail 만 이어 붙여, 목록이 24개로 접히며
// "보던 글이 사라지는" 문제를 막는다. 복원할 게 없으면 null.
function restoreFeed(
  feedKey: string,
  seedItems: PublicFeedItem[],
  seedHasNext: boolean,
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
      Date.now() - snap.savedAt > RESTORE_TTL_MS
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
  featuredFirst = false,
  featuredLabel,
  interleaveNode,
  interleaveAfter = 3,
  interleaveNodes,
  interleaveEvery = 5,
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
  /** Several nodes threaded through the feed one every {@link interleaveEvery} rows (the "지금 이어지는
   *  것들" connection thread). Distinct from {@link interleaveNode} (a single insert): both can coexist
   *  — the series card at {@link interleaveAfter}, the connection thread spaced after it. Each is only
   *  placed when the feed actually has a row past that point (never trails a short feed). */
  interleaveNodes?: ReactNode[];
  /** Row spacing between {@link interleaveNodes} inserts (default: one every 5 rows). */
  interleaveEvery?: number;
}) {
  const t = useTranslations("publicFeed");
  const { prefs } = useTagPrefs();
  // 피드 정체성: 정렬·검색·태그·언어·표면이 같으면 같은 스냅샷을 공유한다.
  const feedKey = useMemo(
    () => `kurl.feed:${variant}:${locale}:${sort}:${tag ?? ""}:${lang ?? ""}:${query?.trim() ?? ""}`,
    [variant, locale, sort, tag, lang, query],
  );

  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // 진행 중이던 loadMore 응답이 필터 전환 뒤 도착해 새 피드에 섞이지 않게 하는 세대 토큰.
  const requestGen = useRef(0);
  const feedKeyRef = useRef(feedKey);

  // 재마운트 시 이 피드의 이전 페이지들을 세션 스냅샷에서 복원한다. 하이드레이션 불일치를 피하려
  // 상태는 SSR 시드로 시작하고, 마운트 후에만 목록을 늘린다(이후 필터 변경은 아래 reset effect 담당).
  useEffect(() => {
    const restored = restoreFeed(feedKey, initialItems, initialHasNext);
    if (restored) {
      setItems(restored.items);
      setPage(restored.page);
      setHasNext(restored.hasNext);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 필터/정렬이 바뀌면(소프트 nav, 리마운트 없음) 시드가 교체된다 — 새 피드의 page 0 으로 초기화하고
  // 세대 토큰을 올려 진행 중이던 이전 필터의 페이지 응답을 무효화한다. (마운트는 위 복원 effect 가 담당)
  useEffect(() => {
    if (feedKeyRef.current === feedKey) return;
    feedKeyRef.current = feedKey;
    requestGen.current += 1;
    setItems(initialItems);
    setPage(0);
    setHasNext(initialHasNext);
    setError(false);
  }, [feedKey, initialItems, initialHasNext]);

  // 로드한 페이지 스냅샷을 세션에 저장해 뒤로가기 복원에 쓴다. page 0(추가 로드 전)은 저장 불필요.
  useEffect(() => {
    if (typeof window === "undefined" || page === 0) return;
    try {
      const snapshot: FeedSnapshot = { items, page, hasNext, savedAt: Date.now() };
      window.sessionStorage.setItem(feedKey, JSON.stringify(snapshot));
    } catch {
      // 용량 초과·스토리지 비활성: 복원은 best-effort 이므로 조용히 무시한다.
    }
  }, [feedKey, items, page, hasNext]);

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

  // Appended rows (not in the SSR seed) fade in on mount, list variant included — same stagger the
  // grid's DiscoveryCell already does. Identity-based (not index) so hidden-tag filtering can't
  // shift an SSR row across the boundary and replay it.
  const initialKeys = useMemo(() => new Set(initialItems.map(itemKey)), [initialItems]);

  // "보고싶은 태그만": drop posts carrying a hidden tag (per-device). The tag currently being viewed
  // is exempt, so a hidden tag's own page still shows its posts. Featured stays pinned to index 0.
  const hiddenSet = new Set(prefs.hidden.filter((h) => h !== tag));
  const visible =
    hiddenSet.size === 0
      ? items
      : items.filter((i) => !i.tags?.some((tg) => hiddenSet.has(tg)));
  const hiddenCount = items.length - visible.length;

  // DiscoveryGrid 는 balanced CSS multicol(1/2/3열): 문서순 i<4 는 전부 1열에 쌓여, 2·3열의 폴드
  // 위 상단 커버(≈ seed/3, 2·seed/3)가 lazy 로 남고 LCP 커버가 지연된다. 각 열의 첫 카드만 eager 로.
  // append 된 페이지는 항상 폴드 아래이므로 seed 범위 안에서만 계산한다.
  const seedLen = Math.min(visible.length, PAGE_SIZE);
  const gridEager = new Set([0, Math.ceil(seedLen / 3), Math.ceil((seedLen * 2) / 3)]);

  // Connection thread: place interleaveNodes[k] after row (interleaveAfter + 1) + k*interleaveEvery,
  // one every few rows — but only where a real post row follows, so the thread never trails the feed.
  // Keyed by the row index it sits AFTER. The single interleaveNode (series card) is handled inline.
  const connectAfter = new Map<number, ReactNode>();
  if (interleaveNodes && interleaveNodes.length > 0) {
    const first = interleaveAfter + 2; // clear the series-card slot (at interleaveAfter) by a row
    for (let k = 0; k < interleaveNodes.length; k++) {
      const rowIdx = first + k * Math.max(1, interleaveEvery);
      if (rowIdx < visible.length) connectAfter.set(rowIdx, interleaveNodes[k]);
    }
  }

  return (
    <>
      {variant === "grid" ? (
        // Browse surface — 전 뷰포트 카드 그리드(타일 = 사진 cover 또는 흰 타이포 카드). 모바일은
        // DiscoveryGrid 의 1열: 예전의 "모바일 = 리스트 행" 분기는 2열 타일의 제목 잘림·masonry
        // 재배치 점프 때문이었는데, 1열 카드는 둘 다 없어서(전폭 제목, 끝에만 append) 카드 문법을
        // 그대로 내려보낼 수 있다 — 두 DOM 트리(md:hidden 페어)도 함께 사라졌다.
        <DiscoveryGrid>
          {/* 셀은 반드시 flat 배열로 — DiscoveryGrid/MasonryChunk 의 Children.toArray 는 Fragment 를
              펼치지 않아, post + 특수 카드를 한 Fragment 로 묶으면 그 둘이 한 셀(한 열)로 붙어 배치된다
              (사장님 "특수 카드 정렬 이상" 근본: 특수 카드가 이웃 포스트에 접착돼 같은 열에 뭉침).
              flatMap 으로 각 셀을 최상위 형제로 내보내면 MasonryChunk 가 특수 카드를 독립적으로 흩뿌린다. */}
          {visible.flatMap((item, i) => {
            const cells: ReactNode[] = [
              // 페이지 청크 안 순서(i % size)대로 25ms 스태거 — append 된 카드만 새로 마운트되므로
              // 기존 카드는 다시 돌지 않고, 새 페이지가 "뚝"이 아니라 줄지어 떠오른다.
              <DiscoveryCell key={itemKey(item)} entranceDelay={Math.min((i % PAGE_SIZE) * 25, 250)}>
                <DiscoveryCard item={item} locale={locale} featured={featuredFirst && i === 0} eager={gridEager.has(i)} />
              </DiscoveryCell>,
            ];
            // 특수 카드(시리즈·연결)는 spread — 최단열 greedy 로 뭉치지 않고 서로 다른 열에 흩뿌려
            // "몇 행마다 하나씩 짜넣기" 의도를 지킨다(discovery-card MasonryChunk 참조).
            if (interleaveNode && i === interleaveAfter && visible.length > interleaveAfter + 1) {
              cells.push(
                <DiscoveryCell key={`series-${itemKey(item)}`} spread>
                  {interleaveNode}
                </DiscoveryCell>,
              );
            }
            if (connectAfter.has(i)) {
              cells.push(
                <DiscoveryCell key={`connect-${i}`} spread>
                  {connectAfter.get(i)}
                </DiscoveryCell>,
              );
            }
            return cells;
          })}
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
                entranceDelay={
                  initialKeys.has(itemKey(item)) ? undefined : Math.min((i % PAGE_SIZE) * 25, 250)
                }
              />
              {interleaveNode && i === interleaveAfter && visible.length > interleaveAfter + 1 && (
                // Bracketed by rules top + bottom so the series block reads as a distinct insert in
                // the feed flow, not just another post row.
                <li className="list-none border-y border-slate-200 py-3.5 dark:border-slate-700">
                  {interleaveNode}
                </li>
              )}
              {connectAfter.has(i) && <li className="list-none py-2">{connectAfter.get(i)}</li>}
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
