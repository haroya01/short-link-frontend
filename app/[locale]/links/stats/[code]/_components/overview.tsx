"use client";

import { useLocale, useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import { KpiLine } from "@/components/links/stats/kpi-line";
import { DeviceChart } from "@/components/links/stats/charts/device-chart";
import { DailyChart } from "@/components/links/stats/charts/daily-chart";
import { StatsJournal } from "@/components/links/stats/journal";
import { LiveClicks } from "@/components/links/shorten/live-clicks";
import { EmptyState } from "@/components/common/empty-state";
import { cn, countryFlag, countryName, formatNumber, formatShare } from "@/lib/utils";
import type { LinkStats } from "@/types";
import { HEADING, RangeSwitch, type RangeDays } from "./section-parts";

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
  const empty = total === 0;

  return (
    <div>
      {empty ? (
        <EmptyState title={t("noClicks")} className="border-t-0 pt-1" />
      ) : (
        <>
          <KpiLine
            hero={{ label: t("kpi.human"), value: formatNumber(data.humanClicks ?? 0) }}
            metrics={[
              { label: t("kpi.totalClicks"), value: formatNumber(total), muted: true },
              { label: t("kpi.unique"), value: formatNumber(data.uniqueClicks ?? 0) },
              { label: t("kpi.bot"), value: formatShare(botRatio), muted: true },
            ]}
          />
          <section aria-labelledby="overview-daily" className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <h2 id="overview-daily" className={HEADING}>
                {t("section.daily.title")}
              </h2>
              <RangeSwitch range={range} onRange={onRange} />
            </div>
            <div className="mt-3">
              <DailyChart data={slicedDaily} compact />
            </div>
          </section>
        </>
      )}

      {!demo && <LiveClicks shortCode={data.shortCode} onTick={onTick} label={t("live.now")} hideWhileWaiting />}

      {!empty && (
        <>
          <div className="mt-10">
            <StatsJournal data={data} onNavigate={onNavigate} initialVisible={2} />
          </div>
          <div className="mt-10 space-y-10 sm:grid sm:grid-cols-[minmax(0,max-content)_minmax(4rem,1fr)_auto_auto] sm:gap-x-4 sm:gap-y-10 sm:space-y-0">
            <Breakdown title={t("section.referrerHost.title")}>
              <BreakdownList
                items={data.referrerHostClicks.map((r) => ({ label: r.host, count: r.count }))}
                maxItems={5}
                subgrid
              />
            </Breakdown>
            <Breakdown title={t("section.device.title")}>
              <DeviceChart data={data.deviceClicks} subgrid />
            </Breakdown>
            <Breakdown title={t("section.country.title")}>
              <BreakdownList
                items={data.countryClicks.map((c) => ({
                  label: countryLabel(c.country, locale, t("countryTable.unknown")),
                  count: c.count,
                }))}
                maxItems={5}
                subgrid
              />
            </Breakdown>
          </div>
        </>
      )}
    </div>
  );
}

function Breakdown({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="sm:col-span-full sm:grid sm:grid-cols-subgrid sm:content-start sm:gap-y-3">
      <h2 className={cn(HEADING, "mb-3 sm:col-span-full sm:mb-0")}>{title}</h2>
      {children}
    </section>
  );
}

function countryLabel(code: string, locale: string, unknown: string) {
  const upper = code?.toUpperCase() ?? "";
  if (upper.length !== 2 || upper === "UN") return unknown;
  return `${countryFlag(upper)} ${countryName(upper, locale)}`;
}
