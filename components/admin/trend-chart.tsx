"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type AdminTrendRow = { date: string; signups: number; links: number; clicks: number };

export function AdminTrendChart({
  data,
  labels,
}: {
  data: AdminTrendRow[];
  labels: { signups: string; links: string; clicks: string };
}) {
  return (
    <ResponsiveContainer className="text-slate-500 dark:text-slate-400" width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "currentColor" }}
          tickFormatter={(v: string) => v.slice(5)}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "currentColor" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {/* Three series share one accent — clicks (the lead metric) carries brand-600,
            links + signups lean on slate so the chart reads as brand-anchored rather than
            rainbow-coded. Distinguishable by hue weight, not unrelated palettes. */}
        <Line
          type="monotone"
          dataKey="signups"
          stroke="#94a3b8"
          strokeWidth={1.5}
          dot={false}
          name={labels.signups}
        />
        <Line
          type="monotone"
          dataKey="links"
          stroke="#334155"
          strokeWidth={1.5}
          dot={false}
          name={labels.links}
        />
        <Line
          type="monotone"
          dataKey="clicks"
          stroke="#059669"
          strokeWidth={1.5}
          dot={false}
          name={labels.clicks}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
