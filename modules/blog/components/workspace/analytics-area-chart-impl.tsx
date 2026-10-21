"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslations } from "next-intl";
import type { DailyPoint } from "@/modules/blog/api/analytics";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";

export function AnalyticsAreaChartImpl({ data }: { data: DailyPoint[] }) {
  const t = useTranslations("blogWorkspace");
  const [reduced] = useState(prefersReducedMotion);
  if (data.length === 0 || data.every((d) => d.views === 0)) {
    return <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">{t("analyticsNoViews")}</p>;
  }
  return (
    <div className="h-64 w-full text-slate-800 dark:text-slate-200">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#9ca49f" }}
            tickFormatter={(v: string) => v.slice(5)}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#9ca49f" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={36}
          />
          <Tooltip
            cursor={{ stroke: "#9ca49f", strokeWidth: 1, strokeDasharray: "3 3" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--chart-tooltip-border)",
              backgroundColor: "var(--chart-tooltip-bg)",
              color: "var(--chart-tooltip-text)",
              fontSize: 12,
              boxShadow: "0 4px 16px rgba(19,26,22,0.08)",
              padding: "8px 12px",
            }}
            itemStyle={{ color: "var(--chart-tooltip-text)" }}
            labelStyle={{ color: "var(--chart-tooltip-text)" }}
            formatter={(value) => [t("analyticsViews", { count: Number(value) }), ""]}
            labelFormatter={(label: string) => label}
          />
          <Line
            type="linear"
            dataKey="views"
            stroke="currentColor"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: "currentColor", stroke: "none" }}
            isAnimationActive={!reduced}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
