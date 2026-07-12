"use client";

import { Globe2, Lightbulb, Link2, MonitorSmartphone, TrendingDown, TrendingUp } from "lucide-react";
import type { ComponentType } from "react";
import { useTranslations } from "next-intl";
import type { LinkStats } from "@/types";

type Insight = {
  label: string;
  value: string;
  detail: string;
  tone?: "positive" | "warning" | "neutral";
  icon: ComponentType<{ className?: string }>;
};

export function InsightSummary({ data }: { data: LinkStats }) {
  const t = useTranslations("stats.insights");

  const trend = getTrend(data);
  const source = pickTop(
    data.utmSourceClicks.map((s) => ({ label: s.source, count: s.count })),
    data.referrerHostClicks.map((s) => ({ label: s.host, count: s.count })),
    t("direct"),
  );
  const country = pickTop(
    data.countryClicks.map((s) => ({ label: s.country, count: s.count })),
    [],
    t("unknown"),
  );
  const device = pickTop(
    data.deviceClicks.map((s) => ({ label: s.device, count: s.count })),
    [],
    t("unknown"),
  );
  const botRatio = data.totalClicks > 0 ? data.botClicks / data.totalClicks : 0;

  const insights: Insight[] = [
    {
      label: t("trend"),
      value:
        trend.previous === 0
          ? t("trendNoBaseline")
          : t(trend.delta >= 0 ? "trendUp" : "trendDown", {
              percent: Math.abs(Math.round(trend.delta * 100)),
            }),
      detail:
        trend.previous === 0
          ? t("trendNoBaselineDetail", { count: trend.current })
          : t("trendDetail", { current: trend.current, previous: trend.previous }),
      tone: trend.delta >= 0 ? "positive" : "warning",
      icon: trend.delta >= 0 ? TrendingUp : TrendingDown,
    },
    {
      label: t("topSource"),
      value: source.label,
      detail: t("countDetail", { count: source.count }),
      icon: Link2,
    },
    {
      label: t("audience"),
      value:
        country.count === 0 && device.count === 0
          ? t("unknown")
          : `${country.label} · ${device.label}`,
      detail:
        country.count === 0 && device.count === 0
          ? t("audienceEmpty")
          : t("audienceDetail", {
              countryCount: country.count,
              deviceCount: device.count,
            }),
      icon: device.label.toLowerCase().includes("mobile") ? MonitorSmartphone : Globe2,
    },
    {
      label: t("quality"),
      value: t(botRatio >= 0.2 ? "botHigh" : "botNormal", {
        percent: Math.round(botRatio * 100),
      }),
      detail:
        botRatio >= 0.2
          ? t("botHighDetail")
          : t("botNormalDetail", { human: data.humanClicks }),
      tone: botRatio >= 0.2 ? "warning" : "positive",
      icon: Lightbulb,
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[11px] font-semibold text-accent-700 dark:text-accent-400">
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {insights.map((insight) => (
          <InsightCard key={insight.label} insight={insight} />
        ))}
      </div>
    </section>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const Icon = insight.icon;
  const tone =
    insight.tone === "positive"
      ? "text-accent-700 dark:text-accent-400 bg-accent-50 dark:bg-accent-500/10"
      : insight.tone === "warning"
        ? "text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800"
        : "text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800";

  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          {insight.label}
        </p>
        <span className={`grid h-7 w-7 place-items-center rounded-md ${tone}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-2 truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100" title={insight.value}>
        {insight.value}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{insight.detail}</p>
    </div>
  );
}

function getTrend(data: LinkStats) {
  const days = data.dailyClicks ?? [];
  const last7 = days.slice(-7).reduce((sum, d) => sum + d.count, 0);
  const previous7 = days.slice(-14, -7).reduce((sum, d) => sum + d.count, 0);
  const delta = previous7 === 0 ? 0 : (last7 - previous7) / previous7;
  return { current: last7, previous: previous7, delta };
}

function pickTop(
  primary: { label: string | null; count: number }[],
  fallback: { label: string | null; count: number }[],
  emptyLabel: string,
) {
  const candidates = [...primary, ...fallback].filter(
    (item): item is { label: string; count: number } =>
      Boolean(item.label) && Number.isFinite(item.count),
  );
  const top = candidates.sort((a, b) => b.count - a.count)[0];
  return top ?? { label: emptyLabel, count: 0 };
}
