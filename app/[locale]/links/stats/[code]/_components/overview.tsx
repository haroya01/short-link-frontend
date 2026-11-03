"use client";

import { useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import { KpiLine } from "@/components/links/stats/kpi-line";
import { DeviceChart } from "@/components/links/stats/charts/device-chart";
import { DailyChart } from "@/components/links/stats/charts/daily-chart";
import { StatsJournal } from "@/components/links/stats/journal";
import { LiveClicksView } from "@/components/links/shorten/live-clicks";
import type { UseClickStreamResult } from "@/hooks/use-click-stream";
import { Breakdown, BreakdownGrid, StatsEmpty, countryItems } from "@/components/links/stats/stat-sections";
import { formatNumber, formatShare } from "@/lib/utils";
import { sourceBreakdown } from "@/lib/stats-sources";
import { useStatsLabels } from "@/lib/stats-labels";
import type { LinkStats } from "@/types";
import { HEADING, RangeSwitch, type RangeDays } from "./section-parts";

export function OverviewKpis({ data }: { data: LinkStats }) {
  const t = useTranslations("stats");
  const total = data.totalClicks ?? 0;
  const botRatio = total > 0 ? (data.botClicks ?? 0) / total : 0;
  return (
    <KpiLine
      hero={{ label: t("kpi.human"), value: formatNumber(data.humanClicks ?? 0) }}
      metrics={[
        { label: t("kpi.totalClicks"), value: formatNumber(total), muted: true },
        { label: t("kpi.unique"), value: formatNumber(data.uniqueClicks ?? 0) },
        { label: t("kpi.bot"), value: formatShare(botRatio), muted: true },
      ]}
    />
  );
}

export function OverviewBreakdowns({ data }: { data: LinkStats }) {
  const t = useTranslations("stats");
  const labels = useStatsLabels();
  return (
    <BreakdownGrid>
      <Breakdown title={t("section.referrerHost.title")}>
        <BreakdownList {...sourceBreakdown(data, labels.channel("direct"))} maxItems={5} subgrid />
      </Breakdown>
      <Breakdown title={t("section.device.title")}>
        <DeviceChart data={data.deviceClicks} subgrid />
      </Breakdown>
      <Breakdown title={t("section.country.title")}>
        <BreakdownList items={countryItems(data.countryClicks, labels)} total={data.humanClicks} maxItems={5} subgrid />
      </Breakdown>
    </BreakdownGrid>
  );
}

export function StatsOverview({
  data,
  slicedDaily,
  range,
  onRange,
  onNavigate,
  stream,
  shortUrl,
  demo = false,
}: {
  data: LinkStats;
  slicedDaily: LinkStats["dailyClicks"];
  range: RangeDays;
  onRange: (r: RangeDays) => void;
  onNavigate: (section: string) => void;
  stream: UseClickStreamResult;
  shortUrl?: string;
  demo?: boolean;
}) {
  const t = useTranslations("stats");
  const total = data.totalClicks ?? 0;
  const human = data.humanClicks ?? 0;

  return (
    <div>
      {total === 0 ? (
        <StatsEmpty title={t("noClicks")} shortUrl={shortUrl} />
      ) : (
        <>
          <OverviewKpis data={data} />
          {human === 0 ? (
            <StatsEmpty title={t("noHumanClicks")} shortUrl={shortUrl} />
          ) : (
            <section aria-labelledby="overview-daily" className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <h2 id="overview-daily" className={HEADING}>
                  {t("section.daily.title")}
                </h2>
                <RangeSwitch range={range} onRange={onRange} />
              </div>
              <div className="mt-3">
                <DailyChart data={slicedDaily} timezone={data.timezone} compact />
              </div>
            </section>
          )}
        </>
      )}

      {!demo && <LiveClicksView stream={stream} label={t("live.now")} hideWhileWaiting />}

      {human > 0 && (
        <>
          <div className="mt-10">
            <StatsJournal data={data} onNavigate={onNavigate} initialVisible={2} />
          </div>
          <div className="mt-10">
            <OverviewBreakdowns data={data} />
          </div>
        </>
      )}
    </div>
  );
}
