"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getSeriesStats } from "@/modules/blog/api/analytics";
import { getSeries } from "@/modules/blog/api/series";
import { ProfileStatsDashboard } from "@/modules/profile/components/stats-dashboard";
import { SkeletonRows, SkeletonStatCards } from "@/modules/blog/components/skeleton";
import type { ProfileStats } from "@/types";

/**
 * Deep per-series reader analytics — the same dimensional breakdown as the profile-visit dashboard,
 * aggregated across the series' member posts. Reuses {@link ProfileStatsDashboard}. Data comes from
 * {@code getSeriesStats} (backend {@code GET /api/v1/series/{id}/stats}, mock-backed until shipped).
 */
export default function SeriesAnalyticsPage() {
  const t = useTranslations("blogWorkspace");
  const params = useParams();
  const pathname = usePathname();
  const seriesId = Number(params.seriesId);
  const { ready, authenticated } = useAuth();
  const [title, setTitle] = useState("");
  const [data, setData] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !authenticated || !Number.isFinite(seriesId)) return;
    setLoading(true);
    getSeriesStats(seriesId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
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
        <div className="mt-6">
          <ProfileStatsDashboard data={data} />
        </div>
      )}
    </main>
  );
}
