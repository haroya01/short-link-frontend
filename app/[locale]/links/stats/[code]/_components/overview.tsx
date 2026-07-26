"use client";

import dynamic from "next/dynamic";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import { DeviceChart } from "@/components/links/stats/charts/device-chart";
import { Heatmap } from "@/components/links/stats/charts/heatmap";
import { StatsJournal } from "@/components/links/stats/journal";
import { LiveClickFeed } from "@/components/links/stats/live-click-feed";
import { LiveClickFeedDemo } from "@/components/links/stats/live-click-feed-demo";
import { Sparkline } from "@/components/links/stats/sparkline";
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
 * 개요 = 일지가 1면. 위에서 아래로:
 *  1) 마스트헤드 — 총 클릭 큰 숫자 + 사람/유니크/봇/가속을 한 줄에, 오른쪽 미니 스파크라인.
 *     카드 상자 없이 하단 헤어라인 구획(§10 종이 문법). 구 KPI 스트립과 딥그린 타일의 중복을
 *     여기서 하나로 접었다 — 초록은 마커(스파크선·라이브 수치)로만, 초록 면은 없다.
 *  2) 링크 일지 — 문장 인사이트가 주인공. 문장을 누르면 그 자리에서 근거가 펼쳐진다.
 *  3) 상세 — 기존 시각화 타일 전부(추이·라이브·히트맵·유입·기기·국가)를 제목 아래로 강등.
 *     타일 우상단 화살표는 그대로 챕터 상세(2층)로 내려간다.
 */
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
  const humanRatio = total > 0 ? ((data.humanClicks ?? 0) / total) * 100 : 0;
  const botRatio = total > 0 ? ((data.botClicks ?? 0) / total) * 100 : 0;
  const uniqueRatio =
    (data.humanClicks ?? 0) > 0 ? ((data.uniqueClicks ?? 0) / data.humanClicks) * 100 : 0;
  const animatedTotal = useCountUp(total, 900, !demo);
  const velocity = data.velocity?.ratio ?? 0;
  const sparkSeries = slicedDaily.map((d) => d.count);

  return (
    <div>
      {/* 마스트헤드 — 신문 1면의 제호 줄. 수치는 여기 한 번만 나온다. */}
      <section className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <dl className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <dt className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t("kpi.totalClicks")}
              </dt>
              <dd className="mt-1.5 font-mono text-[38px] font-bold leading-none tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
                {formatNumber(animatedTotal)}
              </dd>
            </div>
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
          {sparkSeries.length > 1 && (
            <div className="flex items-end gap-2">
              <Sparkline
                values={sparkSeries}
                width={160}
                height={40}
                className="text-accent-600 dark:text-accent-400"
              />
              <span className="font-mono text-[10px] font-medium text-slate-400 dark:text-slate-500">
                {range}D
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 링크 일지 — 1면 주인공. 문장을 누르면 그 자리에서 근거가 펼쳐진다. */}
      <div className="mt-6">
        <StatsJournal data={data} onNavigate={onNavigate} />
      </div>

      {/* 상세 — 시각화 타일 전부를 한 제목 아래로. */}
      <section className="mt-10">
        <h2 className="border-b border-slate-100 pb-2.5 text-[12px] font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {t("detailsTitle")}
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
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
                      "rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase transition-[color,background-color,transform] duration-150 ease-[var(--ease)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600",
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
            className="cv-auto lg:col-span-7"
          >
            <Heatmap data={data.heatmap} />
          </Tile>

          <Tile
            label={t("section.referrerHost.title")}
            section="section-sources"
            onNavigate={onNavigate}
            className="cv-auto lg:col-span-5"
          >
            <BreakdownList
              items={data.referrerHostClicks.slice(0, 5).map((r) => ({ label: r.host, count: r.count }))}
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
              items={data.countryClicks.slice(0, 5).map((c) => ({ label: c.country, count: c.count }))}
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
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 pb-0.5">
      <dt className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</dt>
      <dd
        className={cn(
          "font-mono text-[16px] font-bold leading-none tracking-tight tabular-nums",
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
                className="focus-ring rounded-md p-1 text-slate-400 transition-[color,transform] duration-150 ease-[var(--ease)] hover:text-accent-700 active:scale-90 dark:text-slate-500 dark:hover:text-accent-400"
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
