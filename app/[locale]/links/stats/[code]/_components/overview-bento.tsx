"use client";

import dynamic from "next/dynamic";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import { DeviceChart } from "@/components/links/stats/charts/device-chart";
import { Heatmap } from "@/components/links/stats/charts/heatmap";
import { StatsHeroCore } from "@/components/links/stats/hero-panel";
import { StatsJournal } from "@/components/links/stats/journal";
import { LiveClickFeed } from "@/components/links/stats/live-click-feed";
import { LiveClickFeedDemo } from "@/components/links/stats/live-click-feed-demo";
import { useCountUp } from "@/lib/animations";
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

/**
 * 개요 = 벤토 그리드 — "한눈에·한번에·깔끔"의 답. 핵심 시각화 전부(수치 스트립·딥그린 히어로·
 * 일지·추이·라이브·히트맵·유입·기기·국가)가 한 그리드에 동시에 보이고, 타일 우상단 화살표가
 * 그 데이터가 사는 챕터 상세(2층)로 내려간다 — v1(전부 세로 나열)과 v2(문 뒤에 숨김)의 종합.
 * 타일은 전부 실존 컴포넌트 재배치라 상세와 같은 그림을 그린다(과장 방지 계약).
 */
export function OverviewBento({
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
  const humanRatio = total > 0 ? ((data.humanClicks ?? 0) / total) * 100 : 0;
  const botRatio = total > 0 ? ((data.botClicks ?? 0) / total) * 100 : 0;
  const uniqueRatio =
    (data.humanClicks ?? 0) > 0 ? ((data.uniqueClicks ?? 0) / data.humanClicks) * 100 : 0;
  const animatedTotal = useCountUp(total, 900, !demo);
  const velocity = data.velocity?.ratio ?? 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
      {/* 수치 스트립 — 구 KPI 카드 6장의 정보를 한 줄로 압축 */}
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-12">
        <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
          <Metric label={t("kpi.totalClicks")} value={formatNumber(animatedTotal)} strong />
          <Metric label={t("kpi.human")} value={`${humanRatio.toFixed(1)}%`} />
          <Metric
            label={t("kpi.unique")}
            value={`${formatNumber(data.uniqueClicks ?? 0)} · ${uniqueRatio.toFixed(0)}%`}
          />
          <Metric label={t("kpi.bot")} value={`${botRatio.toFixed(1)}%`} muted />
          {velocity >= 1.5 && (
            <Metric label={t("kpi.velocityHot")} value={`${velocity.toFixed(1)}x`} accent />
          )}
        </dl>
      </section>

      {/* 딥그린 히어로 — 랜딩·데모와 같은 컴포넌트 */}
      <button
        type="button"
        onClick={() => onNavigate("section-daily")}
        className="focus-ring group overflow-hidden rounded-2xl border border-accent-800 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(15,23,42,0.14)] active:translate-y-0 dark:border-accent-500/30 lg:col-span-5"
      >
        <StatsHeroCore
          label={t("kpi.totalClicks")}
          caption={`${t("kpi.human")} ${humanRatio.toFixed(0)}%`}
          total={animatedTotal}
          series={slicedDaily.map((d) => d.count)}
          draw={demo ? "static" : "mount"}
          className="h-full rounded-none"
        />
      </button>

      {/* 링크 일지 — 자체 카드 렌더 */}
      <div className="lg:col-span-7">
        <StatsJournal data={data} onNavigate={onNavigate} />
      </div>

      <Tile
        label={t("section.daily.title")}
        section="section-daily"
        onNavigate={onNavigate}
        className="lg:col-span-7"
        actions={
          <div className="inline-flex gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-800/50">
            {([7, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onRange(d)}
                aria-pressed={range === d}
                className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600",
                  range === d
                    ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] dark:bg-slate-900 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                )}
              >
                {d}D
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

      <Tile
        label={t("section.heatmap.title")}
        section="section-heatmap"
        onNavigate={onNavigate}
        className="lg:col-span-7"
      >
        <Heatmap data={data.heatmap} />
      </Tile>

      <Tile
        label={t("section.referrerHost.title")}
        section="section-sources"
        onNavigate={onNavigate}
        className="lg:col-span-5"
      >
        <BreakdownList
          items={data.referrerHostClicks.slice(0, 5).map((r) => ({ label: r.host, count: r.count }))}
        />
      </Tile>

      <Tile
        label={t("section.device.title")}
        section="section-device"
        onNavigate={onNavigate}
        className="lg:col-span-6"
      >
        <DeviceChart data={data.deviceClicks} />
      </Tile>

      <Tile
        label={t("section.country.title")}
        section="chapter-where"
        onNavigate={onNavigate}
        className="lg:col-span-6"
      >
        <BreakdownList
          items={data.countryClicks.slice(0, 5).map((c) => ({ label: c.country, count: c.count }))}
        />
      </Tile>
    </div>
  );
}

function Metric({
  label,
  value,
  strong,
  muted,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</dt>
      <dd
        className={cn(
          "font-mono font-bold leading-none tracking-tight tabular-nums",
          strong ? "text-[24px]" : "text-[16px]",
          accent
            ? "text-accent-700 dark:text-accent-400"
            : muted
              ? "text-slate-400 dark:text-slate-500"
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
          <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</h3>
          <span className="flex items-center gap-1.5">
            {actions}
            {section && onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate(section)}
                aria-label={label}
                className="focus-ring rounded-md p-1 text-slate-400 transition-colors hover:text-accent-700 dark:text-slate-500 dark:hover:text-accent-400"
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
