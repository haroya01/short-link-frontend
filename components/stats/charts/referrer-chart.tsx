"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import type { ReferrerClick } from "@/types";

type Props = { data: ReferrerClick[] };

export function ReferrerChart({ data }: Props) {
  const t = useTranslations("stats");
  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-500">{t("referrerNoData")}</p>;
  }
  const sorted = [...data].sort((a, b) => a.count - b.count).slice(-10);
  const formatted = sorted.map((d) => ({
    ...d,
    label: shortenReferrer(d.referrer),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formatted}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            tick={{ fontSize: 11, fill: "#475569" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(5,150,105,0.06)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              fontSize: 12,
              boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
              padding: "8px 12px",
            }}
            formatter={(value) => [value, ""]}
            labelFormatter={(_l, payload) => payload?.[0]?.payload?.referrer ?? ""}
          />
          <Bar
            dataKey="count"
            fill="#10B981"
            radius={[0, 4, 4, 0]}
            barSize={12}
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function shortenReferrer(ref: string): string {
  try {
    const u = new URL(ref);
    return u.host.replace(/^www\./, "");
  } catch {
    return ref.length > 24 ? ref.slice(0, 24) + "…" : ref;
  }
}
