"use client";

import { useLocale, useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import { KpiLine } from "@/components/links/stats/kpi-line";
import { DeviceChart } from "@/components/links/stats/charts/device-chart";
import { StatsJournal } from "@/components/links/stats/journal";
import { LiveClickFeed } from "@/components/links/stats/live-click-feed";
import { LiveClickFeedDemo } from "@/components/links/stats/live-click-feed-demo";
import { LazyDailyChart } from "@/components/links/stats/charts/lazy-charts";
import { cn, countryFlag, countryName, formatNumber, formatShare } from "@/lib/utils";
import type { LinkStats } from "@/types";
import type { RangeDays } from "./chapters/when-chapter";

export function StatsOverview({
  data,
  slicedDaily,
  range,
  onRange,
  onNavigate,
  onTick,
  demo = false,
}: {
  data: LinkStats;
  slicedDaily: LinkStats["dailyClicks"];
  range: RangeDays;
  onRange: (r: RangeDays) => void;
  onNavigate: (section: string) => void;
  onTick: () => void;
  demo?: boolean;
}) {
  const t = useTranslations("stats");
  const locale = useLocale();
  const total = data.totalClicks ?? 0;
  const botRatio = total > 0 ? (data.botClicks ?? 0) / total : 0;

  return (
    <div>
      <KpiLine
        hero={{ label: t("kpi.human"), value: formatNumber(data.humanClicks ?? 0) }}
        metrics={[
          { label: t("kpi.totalClicks"), value: formatNumber(total), muted: true },
          { label: t("kpi.unique"), value: formatNumber(data.uniqueClicks ?? 0) },
          { label: t("kpi.bot"), value: formatShare(botRatio), muted: true },
        ]}
      />

      <section className="mt-5">
        <h2 className="sr-only text-base font-semibold sm:not-sr-only sm:block text-slate-900 dark:text-slate-100">
          {t("trendTitle")}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-12">
          <Tile
            label={t("section.daily.title")}
            className="lg:col-span-7"
            actions={
              <div className="inline-flex gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                {([7, 30] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onRange(d)}
                    aria-pressed={range === d}
                    className={cn(
                      "min-h-9 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600",
                      range === d
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                    )}
                  >
                    {t("rangeDays", { days: d })}
                  </button>
                ))}
              </div>
            }
          >
            <LazyDailyChart data={slicedDaily} compact />
          </Tile>

          <Tile className="lg:col-span-5">
            {demo ? <LiveClickFeedDemo /> : <LiveClickFeed shortCode={data.shortCode} onTick={onTick} />}
          </Tile>

          <div className="lg:col-span-12"><StatsJournal data={data} onNavigate={onNavigate} initialVisible={2} /></div>
          <Tile
            label={t("section.referrerHost.title")}
            className="cv-auto lg:col-span-4"
          >
            <BreakdownList
              items={data.referrerHostClicks.map((r) => ({ label: r.host, count: r.count }))}
              maxItems={5}
            />
          </Tile>

          <Tile
            label={t("section.device.title")}
            className="cv-auto lg:col-span-4"
          >
            <DeviceChart data={data.deviceClicks} />
          </Tile>

          <Tile
            label={t("section.country.title")}
            className="cv-auto lg:col-span-4"
          >
            <BreakdownList
              items={data.countryClicks.map((c) => ({ label: countryLabel(c.country, locale, t("countryTable.unknown")), count: c.count }))}
              maxItems={5}
            />
          </Tile>
        </div>
      </section>
    </div>
  );
}

function Tile({
  label,
  actions,
  children,
  className,
}: {
  label?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5",
        className,
      )}
    >
      {(label || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{label}</h3>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

function countryLabel(code: string, locale: string, unknown: string) {
  const upper = code?.toUpperCase() ?? "";
  if (upper.length !== 2 || upper === "UN") return unknown;
  return `${countryFlag(upper)} ${countryName(upper, locale)}`;
}
