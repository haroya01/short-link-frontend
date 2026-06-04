"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Eye, Heart, MousePointerClick, TrendingUp, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getPostAnalytics, getPostStats, type PostAnalytics } from "@/modules/blog/api/analytics";
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
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label={t("analyticsWindowViews", { days })} value={data.windowViews} />
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
