"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, Heart, FileText, MousePointerClick, TrendingUp, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import {
  getAuthorAnalyticsOverview,
  getPostPerformance,
  type AuthorAnalyticsOverview,
  type PostPerformanceSort,
  type TopPost,
} from "@/modules/blog/api/analytics";
import { AnalyticsAreaChart } from "@/modules/blog/components/workspace/analytics-area-chart";
import { StatCard, WindowTabs } from "@/modules/blog/components/workspace/analytics-bits";
import { SkeletonRows, SkeletonStatCards } from "@/modules/blog/components/skeleton";

export default function BlogAnalyticsPage() {
  const t = useTranslations("blogWorkspace");
  const { ready, authenticated } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AuthorAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !authenticated) return;
    setLoading(true);
    getAuthorAnalyticsOverview(days)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [ready, authenticated, days]);

  if (!ready) return null;
  if (!authenticated) {
    return <main className="px-6 py-12 text-slate-600 dark:text-slate-300">{t("loginRequired")}</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      {/* 전체 분석은 글 허브(/write)의 한 facet — 사이드바 진입점이 없으므로 거기로 돌아가는 링크를 둔다. */}
      <a
        href="/write"
        className="focus-ring mb-3 inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToPosts")}
      </a>
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
        <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">{t("analyticsEmpty")}</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label={t("analyticsWindowViews", { days })} value={data.windowViews} />
            <StatCard icon={<Eye className="h-4 w-4" />} label={t("analyticsLifetimeViews")} value={data.lifetimeViews} />
            <StatCard icon={<Heart className="h-4 w-4" />} label={t("analyticsLifetimeLikes")} value={data.lifetimeLikes} />
            <StatCard icon={<UserPlus className="h-4 w-4" />} label={t("analyticsFollows")} value={data.lifetimeFollows} />
            <StatCard icon={<FileText className="h-4 w-4" />} label={t("analyticsPublished")} value={data.publishedPosts} />
          </div>

          {/* kurl 연동 차별점 — 글 안 kurl 링크가 만든 클릭. */}
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-accent-200 bg-accent-50/50 p-4">
            <div>
              <div className="flex items-center gap-1.5 text-accent-700 dark:text-accent-300">
                <MousePointerClick className="h-4 w-4" />
                <span className="text-[13px] font-semibold">{t("analyticsLinkClicksAll")}</span>
              </div>
              <p className="mt-0.5 text-[12px] text-accent-700/70 dark:text-accent-300/70">
                {t("analyticsWindowClicks", { days, count: data.windowLinkClicks })}
              </p>
            </div>
            <span className="text-2xl font-bold tracking-tight text-accent-700 dark:text-accent-300">
              {data.lifetimeLinkClicks.toLocaleString()}
            </span>
          </div>

          <section className="mt-8 rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
            <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("analyticsOverTime")}</h2>
            <AnalyticsAreaChart data={data.daily} />
          </section>

          {/* Every post, views-first, lazy-loaded — so a few hundred posts don't all arrive at once. */}
          {data.totalPosts > 0 && <PostPerformanceList />}
        </>
      )}
    </main>
  );
}

const SORTS: PostPerformanceSort[] = ["views", "likes", "recent"];

/** Per-post performance, sortable, appended page-by-page as the reader nears the end. */
function PostPerformanceList() {
  const t = useTranslations("blogWorkspace");
  const [sort, setSort] = useState<PostPerformanceSort>("views");
  const [items, setItems] = useState<TopPost[]>([]);
  const [nextPage, setNextPage] = useState(0);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset + load the first page whenever the sort changes (and on mount).
  useEffect(() => {
    let alive = true;
    setItems([]);
    setNextPage(0);
    setHasNext(true);
    setLoading(true);
    getPostPerformance(0, 20, sort)
      .then((res) => {
        if (!alive) return;
        setItems(res.items);
        setHasNext(res.hasNext);
        setNextPage(1);
      })
      .catch(() => alive && setHasNext(false))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [sort]);

  const loadMore = useCallback(async () => {
    if (loading || !hasNext || nextPage === 0) return; // nextPage 0 = first page not in yet
    setLoading(true);
    try {
      const res = await getPostPerformance(nextPage, 20, sort);
      setItems((prev) => [...prev, ...res.items]);
      setHasNext(res.hasNext);
      setNextPage((p) => p + 1);
    } catch {
      setHasNext(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasNext, nextPage, sort]);

  // Append subsequent pages when the sentinel scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("analyticsPerPost")}</h2>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-800">
          {SORTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              aria-pressed={sort === s}
              className={`focus-ring rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                sort === s
                  ? "bg-accent-600 text-white"
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
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">{t("analyticsEmpty")}</p>
      ) : (
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((p) => (
          <li key={p.postId}>
            <a
              href={`/analytics/${p.postId}`}
              className="group -mx-3 flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-slate-900 group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-300">
                {p.title || p.slug}
              </span>
              <span className="flex shrink-0 items-center gap-3 text-[12px] text-slate-400 dark:text-slate-500">
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
            </a>
          </li>
        ))}
      </ul>
      )}
      <div ref={sentinelRef} aria-hidden className="h-px" />
      {loading && items.length > 0 && (
        <p className="py-4 text-center text-[12px] text-slate-400 dark:text-slate-500">···</p>
      )}
    </section>
  );
}
