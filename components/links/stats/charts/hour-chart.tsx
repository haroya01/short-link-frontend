"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import type { HourClick } from "@/types";

type Props = { data: HourClick[] };

/**
 * Hour-of-day is a continuous daily rhythm (a morning ramp, an evening peak), so it reads as a
 * curve rather than 24 disconnected bars. Monotone interpolation keeps the empty small-hours from
 * dipping below zero and matches the daily-trend chart's line language, so the two "volume over
 * time" charts on the Traffic tab read as one family.
 */
export function HourChart({ data }: Props) {
  const t = useTranslations("stats");
  const filled = Array.from({ length: 24 }, (_, hour) => {
    const found = data.find((d) => d.hour === hour);
    return { hour, count: found?.count ?? 0 };
  });
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={filled} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="hourFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            interval={3}
            tickFormatter={(h: number) => String(h)}
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
            labelFormatter={(label: number) => `${String(label).padStart(2, "0")}:00`}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#059669"
            strokeWidth={1.5}
            fill="url(#hourFill)"
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
