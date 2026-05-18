"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DeviceClick } from "@/types";
import { formatNumber } from "@/lib/utils";

type Props = { data: DeviceClick[] };

const LABELS: Record<string, string> = {
  mobile: "모바일",
  desktop: "데스크톱",
  tablet: "태블릿",
  bot: "봇",
  unknown: "기타",
};

const COLORS = ["#059669", "#10B981", "#34D399", "#6EE7B7", "#A7F3D0"];

export function DeviceChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-500">데이터 없음</p>;
  }
  const total = data.reduce((acc, d) => acc + d.count, 0) || 1;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-48 w-full sm:w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="device"
              innerRadius={42}
              outerRadius={68}
              paddingAngle={2}
              stroke="none"
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                fontSize: 12,
                boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
                padding: "8px 12px",
              }}
              formatter={(value: number, _name, ctx) => [
                `${formatNumber(value)}회 (${((value / total) * 100).toFixed(1)}%)`,
                LABELS[ctx.payload.device as string] ?? ctx.payload.device,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid w-full grid-cols-2 gap-1.5 sm:w-1/2 sm:grid-cols-1">
        {data.map((d, i) => (
          <li key={d.device} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-slate-700">
              <span
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              {LABELS[d.device] ?? d.device}
            </span>
            <span className="font-mono tabular-nums text-slate-600">
              {formatNumber(d.count)}
              <span className="ml-1.5 text-[10px] text-slate-500">
                {((d.count / total) * 100).toFixed(0)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
