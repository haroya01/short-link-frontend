"use client";

import { BarChart3 } from "lucide-react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useAuth } from "@/lib/auth";
import { getLinkOverview, type LinkOverview } from "@/lib/api/link-library";
import { formatNumber } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { WeekLinkRow } from "./_components/week-link-row";

// 하단 탭 '분석'은 어느 화면에서나 프리페치된다 — recharts 는 막대를 그릴 때만 받는다. 막대 칸은
// h-44 고정이라 자리표시자가 같은 칸을 채운다.
const WeekBars = dynamic(() => import("./_components/week-bars").then((m) => m.WeekBars), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-lg bg-slate-100/70 dark:bg-slate-800/40" />
  ),
});

// MySQL DAYOFWEEK(1=일요일)를 달력의 한 일요일(2026-09-06)에 얹어 요일·시각을 로케일대로 쓴다.
function peakMoment(peak: NonNullable<LinkOverview["peak"]>): Date {
  return new Date(Date.UTC(2026, 8, 5 + peak.dayOfWeek, peak.hour));
}

export default function LinkAnalyticsPage() {
  const reducedMotion = useReducedMotion();
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
    return <SignInEmptyState page reason="stats" icon={BarChart3} />;
  }

  const data = overview.data;
  const daily = (data?.dailyClicks ?? []).map((d) => ({ ...d, label: d.date.slice(5) }));

  return (
    <div className="container max-w-3xl space-y-10 py-8">
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
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("weekHumanClicks")}</p>
            <p className="mt-1 text-[40px] font-semibold leading-none tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
              {formatNumber(data.clicks7d)}
            </p>
            <WeekComparison current={data.clicks7d} previous={data.previousClicks7d} />
            <p className="mt-1 text-sm tabular-nums text-slate-500 dark:text-slate-400">
              {t("today", { count: formatNumber(data.clicksToday) })}
              {data.peak && data.peak.clicks > 1 && (
                <>
                  <span aria-hidden className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                  {t("peak", {
                    when: format.dateTime(peakMoment(data.peak), { weekday: "long", hour: "numeric", timeZone: "UTC" }),
                  })}
                </>
              )}
            </p>
            {daily.length > 0 && (
              <div className="mt-6 h-44 text-slate-500 dark:text-slate-400" role="img" aria-label={daily.map((d) => `${d.label} ${d.count}`).join(", ")}>
                <WeekBars data={daily} seriesLabel={t("humanClicks")} animate={!reducedMotion} />
              </div>
            )}
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{t("scopeNote", { tz: data.timezone })}</p>
          </section>

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
    </div>
  );
}

function WeekComparison({ current, previous }: { current: number; previous?: number }) {
  const t = useTranslations("linkAnalytics");
  if (previous == null || (previous === 0 && current === 0)) return null;
  const percent = previous === 0 ? 0 : Math.round((Math.abs(current - previous) / previous) * 100);
  const text =
    previous === 0
      ? t("vsPrevNone")
      : percent === 0
        ? t("vsPrevSimilar", { count: formatNumber(previous) })
        : t(current > previous ? "vsPrevUp" : "vsPrevDown", { percent, count: formatNumber(previous) });
  return <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{text}</p>;
}
