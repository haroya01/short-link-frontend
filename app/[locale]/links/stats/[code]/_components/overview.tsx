"use client";

import dynamic from "next/dynamic";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import { DeviceChart } from "@/components/links/stats/charts/device-chart";
import { StatsJournal } from "@/components/links/stats/journal";
import { LiveClickFeed } from "@/components/links/stats/live-click-feed";
import { LiveClickFeedDemo } from "@/components/links/stats/live-click-feed-demo";
import { cn, formatNumber } from "@/lib/utils";
import type { LinkStats } from "@/types";
import type { RangeDays } from "./chapters/when-chapter";

// recharts 는 이 타일만 쓴다 — 뷰포트 도달 시 청크 로드(챕터 상세와 같은 문법).
const DailyChart = dynamic(
  () => import("@/components/links/stats/charts/daily-chart").then((m) => m.DailyChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-52 w-full animate-pulse rounded-lg bg-slate-100/70 dark:bg-slate-800/40" aria-hidden />
    ),
  },
);

/** Human clicks lead; the selected daily trend precedes two expandable observations and detail links. */
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
  const total = data.totalClicks ?? 0;
  const botRatio = total > 0 ? ((data.botClicks ?? 0) / total) * 100 : 0;
  const velocity = data.velocity?.ratio ?? 0;

  return (
    <div>
      {/* 마스트헤드 — 신문 1면의 제호 줄. 수치는 여기 한 번만 나온다. */}
      <section className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <dl className="grid grid-cols-3 items-end gap-x-4 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-8">
            <div className="col-span-3 sm:col-span-1">
              <dt className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                {t("kpi.human")}
              </dt>
              <dd className="mt-1.5 text-[38px] font-bold leading-none tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
                {formatNumber(data.humanClicks ?? 0)}
              </dd>
            </div>
            <Metric label={t("kpi.totalClicks")} value={formatNumber(total)} muted />
            <Metric
              label={t("kpi.unique")}
              value={formatNumber(data.uniqueClicks ?? 0)}
            />
            <Metric label={t("kpi.bot")} value={`${botRatio.toFixed(1)}%`} muted />
            {/* 저표본 게이트 — lib/stats-journal MIN_TOTAL_FOR_INSIGHTS(10)와 같은 문턱.
                총 2클릭에 "24.0x"는 마스트헤드 전체를 과장으로 읽히게 한다. */}
            {velocity >= 1.5 && (data.humanClicks ?? 0) >= 30 && (
              <Metric label={t("kpi.velocityHot")} value={`${velocity.toFixed(1)}x`} className="hidden sm:flex" />
            )}
          </dl>
        </div>
      </section>

      {/* 상세 — 시각화 타일 전부를 한 제목 아래로. */}
      <section className="mt-5">
        <h2 className="sr-only text-base font-semibold sm:not-sr-only sm:block text-slate-900 dark:text-slate-100">
          {t("trendTitle")}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-12">
          <Tile
            label={t("section.daily.title")}
            section="section-daily"
            onNavigate={onNavigate}
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
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                    )}
                  >
                    {t("rangeDays", { days: d })}
                  </button>
                ))}
              </div>
            }
          >
            <DailyChart data={slicedDaily} compact />
          </Tile>

          <Tile className="lg:col-span-5">
            {demo ? <LiveClickFeedDemo /> : <LiveClickFeed shortCode={data.shortCode} onTick={onTick} />}
          </Tile>

          <div className="lg:col-span-12"><StatsJournal data={data} onNavigate={onNavigate} initialVisible={2} /></div>
          <Tile
            label={t("section.referrerHost.title")}
            section="section-sources"
            onNavigate={onNavigate}
            className="cv-auto lg:col-span-5"
          >
            <BreakdownList
              items={data.referrerHostClicks.map((r) => ({ label: r.host, count: r.count }))}
              maxItems={5}
            />
          </Tile>

          <Tile
            label={t("section.device.title")}
            section="section-device"
            onNavigate={onNavigate}
            className="cv-auto lg:col-span-6"
          >
            <DeviceChart data={data.deviceClicks} />
          </Tile>

          <Tile
            label={t("section.country.title")}
            section="chapter-where"
            onNavigate={onNavigate}
            className="cv-auto lg:col-span-6"
          >
            <BreakdownList
              items={data.countryClicks.map((c) => ({ label: c.country, count: c.count }))}
              maxItems={5}
            />
          </Tile>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  muted,
  className,
}: {
  label: string;
  value: string;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 pb-0.5 sm:flex-row sm:items-baseline sm:gap-2", className)}>
      <dt className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{label}</dt>
      <dd
        className={cn(
          "text-[16px] font-bold leading-none tracking-tight tabular-nums",
          muted
              ? "text-slate-500 dark:text-slate-400"
              : "text-slate-900 dark:text-slate-100",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Tile({
  label,
  section,
  onNavigate,
  actions,
  children,
  className,
}: {
  label?: string;
  section?: string;
  onNavigate?: (section: string) => void;
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
          <span className="flex items-center gap-1.5">
            {actions}
            {section && onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate(section)}
                aria-label={label}
                className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-slate-400 transition-[color,transform] duration-150 ease-[var(--ease)] hover:text-accent-700 active:scale-90 dark:text-slate-500 dark:hover:text-accent-400"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        </div>
      )}
      {children}
    </section>
  );
}
