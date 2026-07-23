"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import type { DailyClick } from "@/types";
import { formatNumber } from "@/lib/utils";

type Props = {
  data: DailyClick[];
  /** 벤토 타일용 압축 높이(h-52) — 기본은 챕터 상세의 h-72. */
  compact?: boolean;
};

// Full ISO dates (YYYY-MM-DD) collapse to MM-DD; anything already short (a campaign day bucket
// that arrives pre-shortened) is left as-is so the axis never shows an empty tick.
function shortDate(v: string): string {
  return v.length >= 10 ? v.slice(5) : v;
}

export function DailyChart({ data, compact = false }: Props) {
  const t = useTranslations("stats");
  // On mobile (< 640 px) the recharts default Y-axis tick label needs the full computed track
  // width — pulling the chart back with `left: -16` cuts off "100" / "1k" on narrow viewports.
  // Desktop keeps the original tighter offset because the wider parent absorbs the axis cleanly.
  const isMobile = useIsMobile();
  if (data.length === 0) {
    return <p className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">{t("noClicks")}</p>;
  }
  const peak = data.reduce((best, d) => (d.count > best.count ? d : best), data[0]);
  return (
    <div className="w-full">
      {peak.count > 0 && (
        <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">{t("chart.peak")}</span>
          <span aria-hidden className="mx-1.5 text-slate-300 dark:text-slate-600">
            ·
          </span>
          <span className="font-mono tabular-nums">{shortDate(peak.date)}</span>
          <span aria-hidden className="mx-1.5 text-slate-300 dark:text-slate-600">
            ·
          </span>
          <span className="font-mono tabular-nums">
            {t("clickCount", { count: formatNumber(peak.count) })}
          </span>
        </p>
      )}
      <div className={compact ? "h-52 w-full" : "h-72 w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: isMobile ? 0 : -16 }}
        >
          <defs>
            <linearGradient id="dailyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={shortDate}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: "#059669", strokeWidth: 1, strokeDasharray: "3 3" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--chart-tooltip-border)",
              backgroundColor: "var(--chart-tooltip-bg)",
              color: "var(--chart-tooltip-text)",
              fontSize: 12,
              boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
              padding: "8px 12px",
            }}
            itemStyle={{ color: "var(--chart-tooltip-text)" }}
            labelStyle={{ color: "var(--chart-tooltip-text)" }}
            formatter={(value) => [t("clickCount", { count: String(value) }), t("countryTable.clicks")]}
            labelFormatter={(label: string) => label}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#059669"
            strokeWidth={1.5}
            fill="url(#dailyFill)"
            isAnimationActive
            animationDuration={900}
            animationEasing="ease-out"
          />
          {peak.count > 0 && (
            <ReferenceDot
              x={peak.date}
              y={peak.count}
              r={3.5}
              fill="#059669"
              stroke="#fff"
              strokeWidth={1.5}
              isFront
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}
