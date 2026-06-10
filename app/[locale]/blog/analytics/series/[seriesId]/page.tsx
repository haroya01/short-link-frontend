"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Eye, FileText, Heart, Layers, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  getSeriesDetail,
  getSeriesStats,
  type SeriesAnalyticsDetail,
} from "@/modules/blog/api/analytics";
import { getSeries } from "@/modules/blog/api/series";
import { AnalyticsAreaChart } from "@/modules/blog/components/workspace/analytics-area-chart";
import { SeriesReadThrough, StatCard } from "@/modules/blog/components/workspace/analytics-bits";
import { ProfileStatsDashboard } from "@/modules/profile/components/stats-dashboard";
import { SkeletonRows, SkeletonStatCards } from "@/modules/blog/components/skeleton";
import type { ProfileStats } from "@/types";

/**
 * Per-series analytics — the subscriber trend (구독자 추이) + headline metrics on top, then the deep
 * reader breakdown (ProfileStatsDashboard) aggregated across the series' member posts. Subscriber
 * data comes from {@code getSeriesDetail}; reader stats from {@code getSeriesStats}.
 */
export default function SeriesAnalyticsPage() {
  const t = useTranslations("blogWorkspace");
  const params = useParams();
  const pathname = usePathname();
  const seriesId = Number(params.seriesId);
  const { ready, authenticated } = useAuth();
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState<SeriesAnalyticsDetail | null>(null);
  const [data, setData] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !authenticated || !Number.isFinite(seriesId)) return;
    setLoading(true);
    // All-time subscriber trend (days=0) — the most meaningful "구독자가 이렇게 늘었다" view.
    getSeriesDetail(seriesId, 0)
      .then((d) => {
        setDetail(d);
        if (d.series.title) setTitle(d.series.title);
      })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
    getSeriesStats(seriesId)
      .then(setData)
      .catch(() => setData(null));
    getSeries(seriesId)
      .then((d) => setTitle(d.series.title))
      .catch(() => {});
  }, [ready, authenticated, seriesId]);

  if (!ready) return null;
  if (!authenticated) {
    return <main className="px-6 py-12 text-slate-600 dark:text-slate-300">{t("loginRequired")}</main>;
  }

  // Back to the 시리즈별 보기 (where this analytics entry point lives).
  const backHref = pathname.replace(/\/analytics\/series\/.*$/, "/write?view=series");

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <a
        href={backHref}
        className="focus-ring inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("seriesTitle")}
      </a>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {title ? t("seriesAnalyticsTitle", { title }) : t("analyticsTitle")}
      </h1>

      {loading && !detail ? (
        <div className="mt-6">
          <SkeletonStatCards />
          <div className="mt-8">
            <SkeletonRows count={4} />
          </div>
        </div>
      ) : (
        <>
          {detail && (
            <>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard icon={<Users className="h-4 w-4" />} label={t("analyticsSubscribers")} value={detail.series.subscriberCount} />
                <StatCard icon={<FileText className="h-4 w-4" />} label={t("analyticsPosts")} value={detail.series.postCount} />
                <StatCard icon={<Eye className="h-4 w-4" />} label={t("analyticsLifetimeViews")} value={detail.series.totalViews} />
                <StatCard icon={<Heart className="h-4 w-4" />} label={t("analyticsLifetimeLikes")} value={detail.series.totalLikes} />
              </div>

              {/* 구독자 추이 — 현재까지 유지중인 구독자가 시간에 따라 누적된 곡선. */}
              <section className="mt-8 rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                <h2 className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Users className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  {t("analyticsSubscriberTrend")}
                </h2>
                <AnalyticsAreaChart data={detail.subscriberDaily} />
              </section>

              {/* 화별 성과 · 연속 읽기 — 각 화의 독자와 다음 화로 이어 읽은 비율(read-through). */}
              {detail.members.length > 0 && (
                <section className="mt-8 rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                  <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <Layers className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    {t("analyticsMemberFunnel")}
                  </h2>
                  <p className="mb-3 mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                    {t("analyticsMemberFunnelHint")}
                  </p>
                  <SeriesReadThrough
                    members={detail.members}
                    postHref={(postId) =>
                      pathname.replace(/\/analytics\/series\/.*$/, `/analytics/${postId}`)
                    }
                  />
                </section>
              )}
            </>
          )}

          {/* 독자 분석 — 시리즈 멤버 글 전반의 reader 차원 분해. */}
          {data && (
            <div className="mt-8">
              <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("analyticsReaders")}</h2>
              <ProfileStatsDashboard data={data} />
            </div>
          )}
        </>
      )}
    </main>
  );
}
