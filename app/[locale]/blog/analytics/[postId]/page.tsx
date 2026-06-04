"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Heart, Link2, MousePointerClick, TrendingUp, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getPostAnalytics, getPostStats, type PostAnalytics } from "@/modules/blog/api/analytics";
import { listMyPosts, type PostView } from "@/modules/blog/api/posts";
import { AnalyticsAreaChart } from "@/modules/blog/components/workspace/analytics-area-chart";
import { StatCard, WindowTabs } from "@/modules/blog/components/workspace/analytics-bits";
import { ProfileStatsDashboard } from "@/modules/profile/components/stats-dashboard";
import { SkeletonRows, SkeletonStatCards } from "@/modules/blog/components/skeleton";
import type { ProfileStats } from "@/types";

export default function PostAnalyticsPage() {
  const t = useTranslations("blogWorkspace");
  const params = useParams();
  const postId = Number(params.postId);
  const { ready, authenticated } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<PostAnalytics | null>(null);
  const [deep, setDeep] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [siblings, setSiblings] = useState<PostView[] | null>(null);

  useEffect(() => {
    if (!ready || !authenticated || !Number.isFinite(postId)) return;
    setLoading(true);
    getPostAnalytics(postId, days)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
    // Deep reader breakdown (countries · devices · referrers · UTM · heatmap) — same depth as the
    // profile-visit dashboard, scoped to this post. Loads independently so the light header isn't gated.
    getPostStats(postId, days)
      .then(setDeep)
      .catch(() => setDeep(null));
  }, [ready, authenticated, postId, days]);

  // Sibling published posts (newest first) power the prev/next 글 switcher — flip straight to the next
  // post's readers without bouncing back to the overview. Window-independent, so it loads once.
  useEffect(() => {
    if (!ready || !authenticated) return;
    listMyPosts()
      .then((all) =>
        setSiblings(
          all
            .filter((p) => p.status === "PUBLISHED")
            .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")),
        ),
      )
      .catch(() => setSiblings([]));
  }, [ready, authenticated]);

  const idx = siblings?.findIndex((p) => p.id === postId) ?? -1;
  const prevPost = idx > 0 ? siblings![idx - 1] : null;
  const nextPost = siblings && idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  if (!ready) return null;
  if (!authenticated) {
    return <main className="px-6 py-12 text-slate-600 dark:text-slate-300">{t("loginRequired")}</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <a
        href="/analytics"
        className="focus-ring inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("analyticsTitle")}
      </a>

      {/* Prev/next 글 switcher — absorbs the old 독자 picker: flip between posts' readers in place. */}
      {(prevPost || nextPost) && (
        <nav className="mt-4 flex items-center justify-between gap-3 text-[13px] font-medium">
          {prevPost ? (
            <a
              href={`/analytics/${prevPost.id}`}
              aria-label={`${t("analyticsPrevPost")}: ${prevPost.title || prevPost.slug}`}
              className="focus-ring inline-flex min-w-0 max-w-[45%] items-center gap-1.5 rounded text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-300"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">{prevPost.title || prevPost.slug}</span>
            </a>
          ) : (
            <span />
          )}
          {nextPost ? (
            <a
              href={`/analytics/${nextPost.id}`}
              aria-label={`${t("analyticsNextPost")}: ${nextPost.title || nextPost.slug}`}
              className="focus-ring inline-flex min-w-0 max-w-[45%] items-center gap-1.5 rounded text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-300"
            >
              <span className="truncate">{nextPost.title || nextPost.slug}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </a>
          ) : (
            <span />
          )}
        </nav>
      )}

      {loading && !data ? (
        <div className="mt-6">
          <SkeletonStatCards />
          <div className="mt-8">
            <SkeletonRows count={4} />
          </div>
        </div>
      ) : !data ? (
        <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">{t("analyticsEmpty")}</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <h1 className="max-w-xl text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {data.title || data.slug}
            </h1>
            <WindowTabs days={days} onChange={setDays} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label={days === 0 ? t("analyticsAllViews") : t("analyticsWindowViews", { days })} value={data.windowViews} />
            <StatCard icon={<Eye className="h-4 w-4" />} label={t("analyticsLifetimeViews")} value={data.lifetimeViews} />
            <StatCard icon={<Heart className="h-4 w-4" />} label={t("analyticsLifetimeLikes")} value={data.lifetimeLikes} />
            <StatCard icon={<UserPlus className="h-4 w-4" />} label={t("analyticsFollowsGained")} value={data.lifetimeFollows} />
          </div>

          <div className="mt-3 flex items-center justify-between rounded-2xl border border-accent-200 bg-accent-50/50 p-4">
            <div>
              <div className="flex items-center gap-1.5 text-accent-700 dark:text-accent-300">
                <MousePointerClick className="h-4 w-4" />
                <span className="text-[13px] font-semibold">{t("analyticsLinkClicks")}</span>
              </div>
              <p className="mt-0.5 text-[12px] text-accent-700/70 dark:text-accent-300/70">
                {days === 0
                  ? t("analyticsAllClicks", { count: data.windowLinkClicks })
                  : t("analyticsWindowClicks", { days, count: data.windowLinkClicks })}
              </p>
            </div>
            <span className="text-2xl font-bold tracking-tight text-accent-700 dark:text-accent-300">
              {data.lifetimeLinkClicks.toLocaleString()}
            </span>
          </div>

          {/* 글 안 링크별 분해 — 합계가 어느 링크에서 나왔는지. 링크가 있을 때만 노출. */}
          {data.linkBreakdown.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("analyticsLinkBreakdown")}</h2>
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {data.linkBreakdown.map((lc) => (
                  <li key={lc.shortCode} className="flex items-center gap-3 px-4 py-2.5">
                    <Link2 className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-slate-700 dark:text-slate-200">
                        {lc.destinationUrl}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-slate-400 dark:text-slate-500">
                        kurl.me/{lc.shortCode}
                      </span>
                    </span>
                    <span className="shrink-0 text-[14px] font-semibold tabular-nums text-accent-700 dark:text-accent-300">
                      {lc.clicks.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8 rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
            <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("analyticsOverTime")}</h2>
            <AnalyticsAreaChart data={data.daily} />
          </section>

          {/* Deep reader breakdown — short-link-stats depth, scoped to this post. */}
          {deep && (
            <div className="mt-8">
              <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("analyticsReaders")}</h2>
              <ProfileStatsDashboard data={deep} />
            </div>
          )}
        </>
      )}
    </main>
  );
}
