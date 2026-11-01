"use client";

import { useTranslations } from "next-intl";
import { Heatmap } from "@/components/links/stats/charts/heatmap";
import { LiveClickFeed } from "@/components/links/stats/live-click-feed";
import { LiveClickFeedDemo } from "@/components/links/stats/live-click-feed-demo";
import { DailyChart } from "@/components/links/stats/charts/daily-chart";
import { LazyHourChart } from "@/components/links/stats/charts/lazy-charts";
import { Reveal } from "@/components/common/reveal";
import { Section } from "@/components/common/section";
import { cn } from "@/lib/utils";
import type { LinkStats } from "@/types";

export type RangeDays = 7 | 30;

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
    <div id="chapter-when" className="scroll-mt-28 space-y-4">
      <div id="section-live">
        {demo ? (
          <LiveClickFeedDemo />
        ) : (
          <LiveClickFeed shortCode={data.shortCode} onTick={onTick} />
        )}
      </div>
      <Reveal>
        <Section
          id="section-heatmap"
          title={t("section.heatmap.title")}
          description={t("section.heatmap.desc", { tz: data.timezone })}
        >
          <Heatmap data={data.heatmap} />
        </Section>
      </Reveal>
      {/* 7D/30D 만: API 에 기간 파라미터가 없다. */}
      <div className="flex justify-end">
        <div className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
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
      </div>
      <Reveal delay={60}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Section
            id="section-daily"
            title={t("section.daily.title")}
            description={t("scope.daily", { days: range, tz: data.timezone })}
            className="lg:col-span-2"
          >
            <DailyChart data={dailyClicks ?? data.dailyClicks} />
          </Section>
          <Section
            id="section-hourly"
            title={t("section.hourly.title")}
            description={t("section.hourly.desc")}
          >
            <LazyHourChart data={data.hourClicks} />
          </Section>
        </div>
      </Reveal>
    </div>
  );
}
