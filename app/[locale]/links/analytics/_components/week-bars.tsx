"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/utils";

export function WeekBars({
  data,
  seriesLabel,
  animate,
}: {
  data: { label: string; count: number }[];
  seriesLabel: string;
  animate: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
        <CartesianGrid vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "currentColor" }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "currentColor" }} />
        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.12)" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--chart-tooltip-border)",
            backgroundColor: "var(--chart-tooltip-bg)",
            color: "var(--chart-tooltip-text)",
            fontSize: 12,
            padding: "8px 12px",
          }}
          itemStyle={{ color: "var(--chart-tooltip-text)" }}
          labelStyle={{ color: "var(--chart-tooltip-text)" }}
          formatter={(value: number) => [formatNumber(value), seriesLabel]}
          labelFormatter={(label: string) => label}
        />
        <Bar isAnimationActive={animate} dataKey="count" fill="#059669" radius={[3, 3, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
