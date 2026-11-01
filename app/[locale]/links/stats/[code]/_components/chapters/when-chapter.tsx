"use client";

import { useTranslations } from "next-intl";
import { Heatmap } from "@/components/links/stats/charts/heatmap";
import { LiveClickFeed } from "@/components/links/stats/live-click-feed";
import { DailyChart } from "@/components/links/stats/charts/daily-chart";
import { HourChart } from "@/components/links/stats/charts/hour-chart";
import type { LinkStats } from "@/types";
import { HEADING, RangeSwitch, type RangeDays } from "../section-parts";

export function WhenChapter({
  data,
  dailyClicks,
  range,
  onRange,
  onTick,
  demo = false,
}: {
  data: LinkStats;
  dailyClicks?: LinkStats["dailyClicks"];
  range: RangeDays;
  onRange: (r: RangeDays) => void;
  onTick: () => void;
  demo?: boolean;
}) {
  const t = useTranslations("stats");
  return (
    <div id="chapter-when" className="scroll-mt-28">
      <div id="section-live" className="scroll-mt-28">
        {!demo && <LiveClickFeed shortCode={data.shortCode} onTick={onTick} />}
      </div>
      <section id="section-daily" aria-labelledby="when-daily" className="scroll-mt-28">
        <div className="flex items-center justify-between gap-3">
          <h2 id="when-daily" className={HEADING}>
            {t("section.daily.title")}
          </h2>
          <RangeSwitch range={range} onRange={onRange} />
        </div>
        <div className="mt-3">
          <DailyChart data={dailyClicks ?? data.dailyClicks} compact />
        </div>
      </section>
      <section id="section-hourly" aria-labelledby="when-hourly" className="mt-10 scroll-mt-28">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="when-hourly" className={HEADING}>
            {t("section.hourly.title")}
          </h2>
          <span className="text-[12px] text-slate-500 dark:text-slate-400">{data.timezone}</span>
        </div>
        <div className="mt-3">
          <HourChart data={data.hourClicks} compact />
        </div>
        <h3 id="section-heatmap" className="mt-8 scroll-mt-28 text-[14px] font-semibold text-slate-900 dark:text-slate-100">
          {t("section.heatmap.title")}
        </h3>
        <div className="mt-3">
          <Heatmap data={data.heatmap} />
        </div>
      </section>
    </div>
  );
}
