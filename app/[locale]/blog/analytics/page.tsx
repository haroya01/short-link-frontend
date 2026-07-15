"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ExternalLink, Eye, FileText, Heart, Link2, MousePointerClick, TrendingUp, Users, UserPlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { dateLocale } from "@/lib/date";
import { blogPath, linksHref } from "@/lib/host";
import { Mark } from "@/components/common/logo";
import {
  getAuthorAnalyticsOverview,
  getPostAnalytics,
  getPostPerformance,
  getSeriesAnalytics,
  type AuthorAnalyticsOverview,
  type PostAnalytics,
  type PostPerformanceSort,
  type SeriesAnalyticsRow,
  type TopPost,
} from "@/modules/blog/api/analytics";
import { listMyPosts } from "@/modules/blog/api/posts";
import { AnalyticsAreaChart } from "@/modules/blog/components/workspace/analytics-area-chart";
import { StatCard, WindowTabs } from "@/modules/blog/components/workspace/analytics-bits";
import { SkeletonRows, SkeletonStatCards } from "@/modules/blog/components/skeleton";

type AnalyticsTab = "referrers" | "series" | "links" | "posts";

/** 분석 화면의 섹션 탭 — 히어로 아래에서 유입 경로/시리즈/링크/글 패널을 전환한다(라우팅 없이
 *  인페이지). WindowTabs·내 글의 보기 전환과 같은 pill 세그먼트 — 워크스페이스 전환 컨트롤을
 *  한 가지 모양으로(밑줄 탭은 여기서만 쓰이는 두 번째 문법이었다). role=tab 으로 접근성 유지. */
function SectionTabs({
  active,
  onChange,
  tabs,
}: {
  active: AnalyticsTab;
  onChange: (key: AnalyticsTab) => void;
  tabs: { key: AnalyticsTab; label: string }[];
}) {
  return (
    <div
      role="tablist"
      className="inline-flex max-w-full overflow-x-auto rounded-full border border-slate-200 p-0.5 dark:border-slate-800 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tabItem) => {
        const isActive = tabItem.key === active;
        return (
          <button
            key={tabItem.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tabItem.key)}
            className={`focus-ring whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
              isActive
                ? "bg-accent-700 text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {tabItem.label}
          </button>
        );
      })}
    </div>
  );
}

export default function BlogAnalyticsPage() {
  const t = useTranslations("blogWorkspace");
  const locale = useLocale();
  const { ready, authenticated } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AuthorAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AnalyticsTab>("referrers");

  const TABS: { key: AnalyticsTab; label: string }[] = [
    { key: "referrers", label: t("analyticsReferrers") },
    { key: "series", label: t("analyticsTabSeries") },
    { key: "links", label: t("analyticsTabLinks") },
    { key: "posts", label: t("analyticsTabPosts") },
  ];

  useEffect(() => {
    if (!ready || !authenticated) return;
    setLoading(true);
    getAuthorAnalyticsOverview(days)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [ready, authenticated, days]);

  // 히어로 옆 한 줄 — 이 기간에서 가장 읽힌 하루. 새 데이터 없이 daily 에서 그대로 나온다.
  const peakPoint = (data?.daily ?? []).reduce<{ date: string; views: number } | null>(
    (best, p) => (p.views > 0 && (!best || p.views > best.views) ? p : best),
    null,
  );
  const peak = peakPoint
    ? {
        date: new Date(peakPoint.date).toLocaleDateString(dateLocale(locale), {
          month: "short",
          day: "numeric",
          timeZone: "Asia/Seoul",
        }),
        views: peakPoint.views,
      }
    : null;

  // 로그인 여부가 확정되기 전(!ready)에는 로그인 안내를 띄우지 않는다 — loading 초기값이 true 라
  // 아래 `loading && !data` 스켈레톤이 그대로 노출되어 하드 로드 시 빈 화면 플래시를 막는다.
  if (ready && !authenticated) {
    return <main className="px-6 py-12 text-slate-600 dark:text-slate-300">{t("loginRequired")}</main>;
  }

  return (
    // max-w-3xl: 내 글(2xl)·알림(2xl)과 같은 워크스페이스 호흡에 차트·지표 행만큼만 넓게 —
    // 4xl 은 행 목록이 황량하게 벌어져 혼자 대시보드 같았다.
    <main className="mx-auto max-w-3xl px-6 py-10">
      {/* 분석은 계정 메뉴의 전용 진입점에서 들어오는 독립 화면 — '내 글로 돌아가기' 백링크는 두지 않는다. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t("analyticsTitle")}</h1>
        <WindowTabs days={days} onChange={setDays} />
      </div>

      {loading && !data ? (
        <div className="mt-6">
          <SkeletonStatCards />
          <div className="mt-8">
            <SkeletonRows count={5} />
          </div>
        </div>
      ) : !data ? (
        <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">{t("analyticsEmpty")}</p>
      ) : (
        <>
          {/* 히어로 — 이 페이지의 질문("요즘 얼마나 읽혔나")에 한 숫자로 먼저 답한다. 기간 조회가
              주인공이고 바로 아래 추이 차트가 그 숫자의 전개 — 숫자와 차트를 한 덩어리로 묶어,
              다섯 동급 숫자가 흩어져 있던 판을 위계로 바꾼다. */}
          <section className="mt-7">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <div>
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-[12px] font-medium">
                    {days === 0 ? t("analyticsAllViews") : t("analyticsWindowViews", { days })}
                  </span>
                </div>
                <div className="mt-1 text-[40px] font-bold leading-none tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
                  {data.windowViews.toLocaleString()}
                </div>
              </div>
              {peak && (
                <p className="pb-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                  {t("analyticsPeakDay", { date: peak.date, count: peak.views })}
                </p>
              )}
            </div>
            <div className="mt-5">
              <AnalyticsAreaChart data={data.daily} />
            </div>
          </section>

          {/* 누적 보조 지표 — lifetime 숫자들은 히어로(기간)와 결이 달라 한 단 아래 행으로.
              링크 클릭은 kurl 연동 차별점이라 숫자만 brand-green 으로 조용히 구분. */}
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-slate-100 py-5 sm:grid-cols-3 lg:grid-cols-5 dark:border-slate-800">
            <StatCard icon={<Eye className="h-4 w-4" />} label={t("analyticsLifetimeViews")} value={data.lifetimeViews} />
            <StatCard icon={<Heart className="h-4 w-4" />} label={t("analyticsLifetimeLikes")} value={data.lifetimeLikes} />
            <StatCard icon={<UserPlus className="h-4 w-4" />} label={t("analyticsFollows")} value={data.lifetimeFollows} />
            <StatCard icon={<FileText className="h-4 w-4" />} label={t("analyticsPublished")} value={data.publishedPosts} />
            <StatCard
              icon={<MousePointerClick className="h-4 w-4 text-accent-600 dark:text-accent-400" />}
              label={t("analyticsLinkClicksAll")}
              value={data.lifetimeLinkClicks}
              tone="accent"
            />
          </div>

          {/* 히어로 아래를 유입 경로/시리즈/링크/글 탭으로 나눠 한 화면에 몰리지 않게 뎁스를 준다. */}
          <div className="mt-8">
            <SectionTabs active={tab} onChange={setTab} tabs={TABS} />
          </div>

          {/* 유입 경로 — 같은 윈도우의 top 호스트. 막대는 1위 대비 상대폭(SeriesReadThrough 와
              같은 문법). direct(레퍼러 없음)는 집계에 없어 행도 없다. ?? []: 백엔드(referrers
              필드)보다 프론트가 먼저 배포되는 짧은 창에서도 페이지가 안 죽게. */}
          {tab === "referrers" &&
            ((data.referrers ?? []).length > 0 ? (
            <section className="mt-8">
              <ol className="space-y-1">
                {data.referrers.map((r, i) => {
                  const max = data.referrers[0]?.views || 1;
                  const pct = Math.max(4, Math.round((r.views / max) * 100));
                  return (
                    <li key={r.host} className="-mx-3 flex items-center gap-3 rounded-xl px-3 py-2">
                      <span className="w-5 shrink-0 text-center text-[13px] font-semibold tabular-nums text-slate-300 dark:text-slate-500">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="truncate font-mono text-[13px] text-slate-700 dark:text-slate-200">
                            {r.host}
                          </span>
                          <span className="shrink-0 text-[13px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                            {r.views.toLocaleString()}
                          </span>
                        </span>
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <span
                            className="block h-full rounded-full bg-accent-600"
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
            ) : (
              <p className="mt-8 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {t("analyticsEmpty")}
              </p>
            ))}

          {/* Series — the recurring-readership unit; subscriber count is the headline metric. */}
          {tab === "series" && <SeriesAnalyticsSection />}

          {/* 글 안 링크 — kurl × 웹로그 차별점을 라벨된 섹션으로. 위 클릭 카드의 by-post 분해. */}
          {tab === "links" && <LinksBreakdownSection />}

          {/* Every post, views-first, lazy-loaded. Infinite-scroll, so it lives in its own tab — anything
              below it would be unreachable until fully paged. */}
          {tab === "posts" &&
            (data.totalPosts > 0 ? (
              <PostPerformanceList />
            ) : (
              <p className="mt-8 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {t("analyticsEmpty")}
              </p>
            ))}
        </>
      )}
    </main>
  );
}

const COLLAPSED_ROWS = 10;

/** 목록을 10개로 접어 두고 인라인으로 펼치는 토글 — 분석 개요의 긴 글별 목록들에 뎁스를 준다. */
function ViewAllToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const t = useTranslations("blogWorkspace");
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="focus-ring mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
    >
      {expanded ? t("analyticsCollapse") : t("analyticsViewAll")}
      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
    </button>
  );
}

const SORTS: PostPerformanceSort[] = ["views", "likes", "recent"];

/** Per-post performance, sortable, appended page-by-page as the reader nears the end. */
function PostPerformanceList() {
  const t = useTranslations("blogWorkspace");
  const tc = useTranslations("common");
  const [sort, setSort] = useState<PostPerformanceSort>("views");
  const [items, setItems] = useState<TopPost[]>([]);
  const [nextPage, setNextPage] = useState(0);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  // 실패를 '다음 페이지 없음'으로 위장하지 않는다 — error 는 자동 로더만 멈추고 재시도를 노출한다.
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Collapsed by default to 10 rows; '전체보기' activates the infinite-scroll sentinel.
  const [expanded, setExpanded] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset + load the first page whenever the sort changes (and on mount / retry).
  useEffect(() => {
    let alive = true;
    setItems([]);
    setNextPage(0);
    setHasNext(true);
    setExpanded(false);
    setError(false);
    setLoading(true);
    getPostPerformance(0, 20, sort)
      .then((res) => {
        if (!alive) return;
        setItems(res.items);
        setHasNext(res.hasNext);
        setNextPage(1);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [sort, reloadKey]);

  const loadMore = useCallback(async () => {
    if (loading || !hasNext || nextPage === 0) return; // nextPage 0 = first page not in yet
    setLoading(true);
    setError(false);
    try {
      const res = await getPostPerformance(nextPage, 20, sort);
      setItems((prev) => [...prev, ...res.items]);
      setHasNext(res.hasNext);
      setNextPage((p) => p + 1);
    } catch {
      // hasNext 는 그대로 두고 error 로만 자동 로더를 멈춘다 — 재시도 버튼이 남아 다시 이어 받는다.
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [loading, hasNext, nextPage, sort]);

  // Append subsequent pages when the sentinel scrolls into view. error 상태에선 관찰을 멈춰
  // 깨진 fetch 로 옵저버가 무한히 재시도하지 않게 한다(재시도 성공 시 다시 붙는다).
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, error]);

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("analyticsPerPost")}</h2>
        {/* WindowTabs(7일/30일/전체)와 같은 pill 세그먼트 — 워크스페이스의 전환 컨트롤 한 가지 모양. */}
        <div className="inline-flex rounded-full border border-slate-200 p-0.5 dark:border-slate-800">
          {SORTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              aria-pressed={sort === s}
              className={`focus-ring rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
                sort === s
                  ? "bg-accent-700 text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {t(`analyticsSort.${s}`)}
            </button>
          ))}
        </div>
      </div>
      {items.length === 0 && loading ? (
        <SkeletonRows count={5} />
      ) : items.length === 0 && error ? (
        <div className="py-6 text-center">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
          >
            {tc("retry")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{t("analyticsEmpty")}</p>
      ) : (
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {(expanded ? items : items.slice(0, COLLAPSED_ROWS)).map((p) => (
          <li key={p.postId}>
            <Link
              href={blogPath(`/analytics/${p.postId}`)}
              className="group -mx-3 flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-slate-900 group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-300">
                {p.title || p.slug}
              </span>
              <span className="flex shrink-0 items-center gap-3 text-[12px] text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {p.viewCount.toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  {p.likeCount.toLocaleString()}
                </span>
                {/* 이 글로 늘어난 팔로우 — 브랜드 그린으로, 단순 트래픽이 아니라 '구독으로 이어진' 신호임을 강조. */}
                <span className="inline-flex items-center gap-1 text-accent-600 dark:text-accent-400">
                  <UserPlus className="h-3.5 w-3.5" />
                  {p.followsGained.toLocaleString()}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      )}
      {/* Collapsed → '전체보기' reveals the rest; once expanded, the sentinel resumes infinite scroll. */}
      {!expanded && items.length > 0 && (items.length > COLLAPSED_ROWS || hasNext) && (
        <ViewAllToggle expanded={false} onToggle={() => setExpanded(true)} />
      )}
      {expanded && <div ref={sentinelRef} aria-hidden className="h-px" />}
      {expanded && loading && items.length > 0 && (
        <p className="py-4 text-center text-[12px] text-slate-500 dark:text-slate-400">···</p>
      )}
      {expanded && error && !loading && items.length > 0 && (
        <div className="py-4 text-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
          >
            {tc("retry")}
          </button>
        </div>
      )}
    </section>
  );
}

/** Per-series traction — subscriber count leads (the recurring-readership signal). Hidden if none. */
function SeriesAnalyticsSection() {
  const t = useTranslations("blogWorkspace");
  const [rows, setRows] = useState<SeriesAnalyticsRow[] | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    getSeriesAnalytics()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  if (rows === null || rows.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <Mark className="h-3 w-auto text-slate-400 dark:text-slate-500" />
        {t("analyticsSeries")}
      </h2>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {(expanded ? rows : rows.slice(0, COLLAPSED_ROWS)).map((s) => (
          <li key={s.seriesId}>
            <Link
              href={blogPath(`/analytics/series/${s.seriesId}`)}
              className="group -mx-3 flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-slate-900 group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-300">
                {s.title}
              </span>
              <span className="flex shrink-0 items-center gap-3 text-[12px] text-slate-500 dark:text-slate-400">
                {/* 구독자 — 시리즈의 헤드라인 지표, 브랜드 그린 강조. */}
                <span className="inline-flex items-center gap-1 text-accent-600 dark:text-accent-400">
                  <Users className="h-3.5 w-3.5" />
                  {s.subscriberCount.toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {s.postCount.toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {s.totalViews.toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  {s.totalLikes.toLocaleString()}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length > COLLAPSED_ROWS && (
        <ViewAllToggle expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
      )}
    </section>
  );
}

type LinkRow = { postId: number; title: string; slug: string; clicks: number };

/**
 * 글 안 링크 — kurl × 웹로그 차별점을 분석 안의 라벨된 섹션으로 흡수(옛 /links 페이지). 위 클릭 카드가
 * 합계라면 여기는 "어느 글의 kurl 링크가 그 클릭을 끌었나"의 by-post 분해다. 클릭이 있을 때만 노출.
 * 글별 클릭을 한 번에 주는 list endpoint 가 아직 없어 발행 글마다 fan-out — 백엔드 역인덱스가 들어오면
 * 이 fetch 만 교체한다. 표시값은 lifetimeLinkClicks(윈도우 무관)이라 마운트 1회만 발사하고 윈도우 탭
 * 전환에는 재요청하지 않는다.
 */
function LinksBreakdownSection() {
  const t = useTranslations("blogWorkspace");
  const [rows, setRows] = useState<LinkRow[] | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const published = (await listMyPosts()).filter((p) => p.status === "PUBLISHED");
        const detail = await Promise.all(
          published.map((p) => getPostAnalytics(p.id).catch(() => null)),
        );
        if (cancelled) return;
        const built = detail
          .filter((d): d is PostAnalytics => d !== null)
          .map((d) => ({ postId: d.postId, title: d.title, slug: d.slug, clicks: d.lifetimeLinkClicks }))
          .filter((r) => r.clicks > 0)
          .sort((a, b) => b.clicks - a.clicks);
        setRows(built);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!rows || rows.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Link2 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          {t("linksByPost")}
        </h2>
        <a
          href={linksHref("/dashboard")}
          target="_blank"
          rel="noreferrer"
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
        >
          {t("linksFullDashboard")}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {(expanded ? rows : rows.slice(0, COLLAPSED_ROWS)).map((r, i) => (
          <li key={r.postId}>
            <Link
              href={blogPath(`/analytics/${r.postId}`)}
              className="group -mx-3 flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <span className="w-5 shrink-0 text-center text-[13px] font-semibold text-slate-300 dark:text-slate-500">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-slate-900 group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-300">
                  {r.title || r.slug}
                </span>
                <span className="block truncate font-mono text-[12px] text-slate-500 dark:text-slate-400">
                  /{r.slug}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-accent-700 dark:text-accent-300">
                <MousePointerClick className="h-3.5 w-3.5" />
                {r.clicks.toLocaleString()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length > COLLAPSED_ROWS && (
        <ViewAllToggle expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
      )}
    </section>
  );
}
