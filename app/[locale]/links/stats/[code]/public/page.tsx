"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";
import { usePublicLinkStats } from "@/lib/api/stats.queries";
import { Link } from "@/i18n/navigation";
import { Heatmap } from "@/components/links/stats/charts/heatmap";
import { DailyChart } from "@/components/links/stats/charts/daily-chart";
import { STAT_HEADING, StatsEmpty } from "@/components/links/stats/stat-sections";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { LinksPage } from "@/components/links/links-page";
import { fillDailyClicks } from "@/lib/stats-daily";
import { OverviewBreakdowns, OverviewKpis } from "../_components/overview";

export default function PublicStatsPage() {
  const params = useParams<{ code: string }>();
  const t = useTranslations("stats");
  const tPublic = useTranslations("publicStats");
  const code = params.code;
  const host = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");

  const { data, error, isLoading } = usePublicLinkStats(code);
  const notFound = error instanceof ApiError && error.status === 404;
  const realError = Boolean(error) && !notFound;
  const daily = useMemo(() => fillDailyClicks(data?.dailyClicks ?? [], { timezone: data?.timezone }), [data]);

  if (isLoading) {
    return (
      <LinksPage className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </LinksPage>
    );
  }

  if (realError) {
    return (
      <LinksPage width="narrow">
        <ErrorState onRetry={() => window.location.reload()} />
      </LinksPage>
    );
  }

  if (notFound || !data) {
    return (
      <LinksPage width="narrow">
        <EmptyState
          title={t("notFound")}
          description={t("notFoundDesc")}
          action={
            <Link href="/" className="focus-ring rounded-sm text-[15px] font-medium text-slate-900 underline-offset-4 underline decoration-slate-300 hover:decoration-slate-900 dark:decoration-slate-600 dark:hover:decoration-slate-100 dark:text-slate-100">
              {t("backToDashboard")}
            </Link>
          }
        />
      </LinksPage>
    );
  }

  return (
    <LinksPage className="space-y-5">
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{tPublic("title")}</p>
        <h1 className="mt-1 font-mono text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
          {host}/{data.shortCode}
        </h1>
      </div>

      {(data.humanClicks ?? 0) === 0 ? (
        <>
          {(data.totalClicks ?? 0) > 0 && <OverviewKpis data={data} />}
          <StatsEmpty title={t((data.totalClicks ?? 0) === 0 ? "noClicks" : "noHumanClicks")} />
        </>
      ) : (
        <>
          <OverviewKpis data={data} />
          <section aria-labelledby="public-daily" className="pt-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="public-daily" className={STAT_HEADING}>{t("section.daily.title")}</h2>
              <span className="text-[12px] text-slate-500 dark:text-slate-400">{data.timezone}</span>
            </div>
            <div className="mt-3">
              <DailyChart data={daily} timezone={data.timezone} compact />
            </div>
          </section>
          <div className="pt-5">
            <OverviewBreakdowns data={data} />
          </div>
          <section aria-labelledby="public-heatmap" className="pt-5">
            <h2 id="public-heatmap" className={STAT_HEADING}>{t("section.heatmap.title")}</h2>
            <div className="mt-3">
              <Heatmap data={data.heatmap} />
            </div>
          </section>
        </>
      )}
    </LinksPage>
  );
}
