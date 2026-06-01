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
import type { DailyPoint } from "@/modules/blog/api/analytics";

/**
 * View-over-time line for the author analytics dashboard. Same recharts recipe + brand-green fill as
 * the link stats chart, keyed to the analytics `views` series. Lives in the authoring workspace,
 * which is light-only (matching its sibling pages).
 */
export function AnalyticsAreaChart({ data }: { data: DailyPoint[] }) {
  const t = useTranslations("blogWorkspace");
  if (data.length === 0 || data.every((d) => d.views === 0)) {
    return <p className="py-16 text-center text-sm text-slate-400">{t("analyticsNoViews")}</p>;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="analyticsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={(v: string) => v.slice(5)}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={36}
          />
          <Tooltip
            cursor={{ stroke: "#059669", strokeWidth: 1, strokeDasharray: "3 3" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              fontSize: 12,
              boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
              padding: "8px 12px",
            }}
            formatter={(value) => [t("analyticsViews", { count: String(value) }), ""]}
            labelFormatter={(label: string) => label}
          />
          <Area
            type="monotone"
            dataKey="views"
            stroke="#059669"
            strokeWidth={1.5}
            fill="url(#analyticsFill)"
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
