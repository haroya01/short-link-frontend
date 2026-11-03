"use client";

import { useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { getLinkOverview, type LinkOverview } from "@/lib/api/link-library";
import { formatNumber } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { WeekLinkRow } from "./_components/week-link-row";
import { KpiLine } from "@/components/links/stats/kpi-line";
import { DailyChart } from "@/components/links/stats/charts/daily-chart";
import { STAT_HEADING } from "@/components/links/stats/stat-sections";
import { LinksPage } from "@/components/links/links-page";

// MySQL DAYOFWEEK(1=일요일)를 달력의 한 일요일(2026-09-06)에 얹어 요일·시각을 로케일대로 쓴다.
function peakMoment(peak: NonNullable<LinkOverview["peak"]>): Date {
  return new Date(Date.UTC(2026, 8, 5 + peak.dayOfWeek, peak.hour));
}

export default function LinkAnalyticsPage() {
  const t = useTranslations("linkAnalytics");
  const format = useFormatter();
  const { authenticated, ready, me } = useAuth();
  const enabled = ready && authenticated;
  const overview = useQuery({
    queryKey: ["links", "overview", me?.id],
    queryFn: ({ signal }) => getLinkOverview(signal),
    enabled: enabled && me?.id != null,
  });

  if (ready && !authenticated) {
    return <SignInEmptyState page reason="stats" />;
  }

  const data = overview.data;

  return (
    <LinksPage width="narrow" className="space-y-10">
      <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
        {t("title")}
      </h1>

      {overview.isLoading || !data ? (
        overview.error ? (
          <ErrorState message={t("loadFailed")} onRetry={() => void overview.refetch()} />
        ) : (
          <Skeleton className="h-72 rounded-2xl" />
        )
      ) : (
        <>
          <div>
            <KpiLine
              hero={{ label: t("weekHumanClicks"), value: formatNumber(data.clicks7d) }}
              metrics={[
                { label: t("todayLabel"), value: formatNumber(data.clicksToday) },
                ...(data.previousClicks7d != null ? [{ label: t("prevWeekLabel"), value: formatNumber(data.previousClicks7d), muted: true }] : []),
                ...(data.peak && data.peak.clicks > 1
                  ? [{ label: t("peakLabel"), value: format.dateTime(peakMoment(data.peak), { weekday: "long", hour: "numeric", timeZone: "UTC" }) }]
                  : []),
              ]}
              note={comparison(data.clicks7d, data.previousClicks7d, t)}
            />
            {data.dailyClicks.length > 0 && (
              <section aria-labelledby="analytics-daily" className="mt-8">
                <h2 id="analytics-daily" className={STAT_HEADING}>{t("dailyTitle")}</h2>
                <div className="mt-3">
                  <DailyChart data={data.dailyClicks} timezone={data.timezone} compact />
                </div>
              </section>
            )}
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{t("scopeNote", { tz: data.timezone })}</p>
          </div>

          {(data.zeroClickLinks > 0 || data.expiringLinks > 0) && (
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("attention")}</h2>
              <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                {data.zeroClickLinks > 0 && (
                  <li>
                    {t("zeroClick", { count: data.zeroClickLinks })}
                    <span aria-hidden className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                    <Link href="/dashboard?sort=humanClickCount&dir=asc" className="focus-ring rounded underline decoration-slate-300 underline-offset-4 hover:decoration-current dark:decoration-slate-600">
                      {t("viewFewestClicks")}
                    </Link>
                  </li>
                )}
                {data.expiringLinks > 0 && (
                  <li>
                    <Link href="/dashboard?expiry=EXPIRING_SOON" className="focus-ring rounded underline decoration-slate-300 underline-offset-4 hover:decoration-current dark:decoration-slate-600">
                      {t("expiring", { count: data.expiringLinks })}
                    </Link>
                  </li>
                )}
              </ul>
            </section>
          )}

          {data.weekTopLinks && (
            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("weekTopLinks")}</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t("weekTopLinksNote")}</p>
              {data.weekTopLinks.length > 0 ? (
                <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                  {data.weekTopLinks.map((link) => <WeekLinkRow key={link.shortCode} link={link} />)}
                </div>
              ) : data.totalLinks === 0 ? (
                <Link href="/dashboard" className={buttonVariants({ className: "mt-4" })}>
                  {t("createFirst")}
                </Link>
              ) : (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("weekTopLinksEmpty")}</p>
              )}
            </section>
          )}
        </>
      )}
    </LinksPage>
  );
}

function comparison(current: number, previous: number | undefined, t: ReturnType<typeof useTranslations>) {
  if (previous == null || (previous === 0 && current === 0)) return undefined;
  if (previous === 0) return t("vsPrevNone");
  const percent = Math.round((Math.abs(current - previous) / previous) * 100);
  if (percent === 0) return t("vsPrevSimilar");
  return t(current > previous ? "vsPrevUp" : "vsPrevDown", { percent });
}
