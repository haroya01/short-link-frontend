"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/lib/auth";
import { getLinkOverview } from "@/lib/api/link-library";
import { formatNumber } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { LinksAuthGate } from "@/components/links/auth-gate";
import { LinkListRow } from "@/components/links/link-list-row";
import { WeeklyInsightsCard } from "@/components/links/stats/weekly-insights-card";

export default function LinkAnalyticsPage() {
  const reducedMotion = useReducedMotion();
  const t = useTranslations("linkAnalytics");
  const { authenticated, ready, me } = useAuth();
  const enabled = ready && authenticated;
  const overview = useQuery({
    queryKey: ["links", "overview", me?.id],
    queryFn: ({ signal }) => getLinkOverview(signal),
    enabled: enabled && me?.id != null,
  });

  if (ready && !authenticated) {
    return <LinksAuthGate title={t("loginTitle")} description={t("loginDesc")} next="/analytics" />;
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
            <p className="mt-2 text-sm tabular-nums text-slate-500 dark:text-slate-400">
              {t("todayAndLinks", { today: formatNumber(data.clicksToday), links: data.totalLinks })}
            </p>
            {daily.length > 0 && (
              <div className="mt-6 h-44 text-slate-500 dark:text-slate-400" role="img" aria-label={daily.map((d) => `${d.label} ${d.count}`).join(", ")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
                    <CartesianGrid vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "currentColor" }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "currentColor" }} />
                    <Tooltip
                      cursor={{ fill: "rgba(148,163,184,0.12)" }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--chart-tooltip-border)",
                        backgroundColor: "var(--chart-tooltip-bg)",
                        color: "var(--chart-tooltip-text)",
                        fontSize: 12,
                        padding: "8px 12px",
                      }}
                      itemStyle={{ color: "var(--chart-tooltip-text)" }}
                      labelStyle={{ color: "var(--chart-tooltip-text)" }}
                      formatter={(value: number) => [formatNumber(value), t("humanClicks")]}
                      labelFormatter={(label: string) => label}
                    />
                    <Bar isAnimationActive={!reducedMotion} dataKey="count" fill="#059669" radius={[3, 3, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
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
                    <Link href="/dashboard?sort=clickCount&dir=asc" className="focus-ring rounded underline decoration-slate-300 underline-offset-4 hover:decoration-current dark:decoration-slate-600">
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

          <WeeklyInsightsCard />

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("topLinks")}</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t("topLinksNote")}</p>
            {data.topLinks.length > 0 ? (
              <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                {data.topLinks.map((link) => <LinkListRow key={link.shortCode} link={link} />)}
              </div>
            ) : (
              <Link
                href="/"
                className="focus-ring mt-4 inline-flex h-10 items-center rounded-lg bg-accent-700 px-4 text-sm font-medium text-white hover:bg-accent-800 dark:bg-accent-500 dark:text-slate-950 dark:hover:bg-accent-400"
              >
                {t("createFirst")}
              </Link>
            )}
          </section>
        </>
      )}
    </div>
  );
}
