"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslations } from "next-intl";
import type { DeviceClick } from "@/types";
import { formatNumber } from "@/lib/utils";

type Props = { data: DeviceClick[] };

const COLORS = ["#059669", "#10B981", "#34D399", "#6EE7B7", "#A7F3D0"];

export function DeviceChart({ data }: Props) {
  const t = useTranslations("stats");
  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">{t("noData")}</p>;
  }
  const total = data.reduce((acc, d) => acc + d.count, 0) || 1;
  const labelFor = (device: string) => deviceLabel(device, t);

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
                `${t("clickCount", { count: formatNumber(value) })} (${((value / total) * 100).toFixed(1)}%)`,
                labelFor(ctx.payload.device as string),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid w-full grid-cols-2 gap-1.5 sm:w-1/2 sm:grid-cols-1">
        {data.map((d, i) => (
          <li key={d.device} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              {labelFor(d.device)}
            </span>
            <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
              {formatNumber(d.count)}
              <span className="ml-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                {((d.count / total) * 100).toFixed(0)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function deviceLabel(device: string, t: ReturnType<typeof useTranslations>): string {
  switch (device) {
    case "mobile":
      return t("device.mobile");
    case "desktop":
      return t("device.desktop");
    case "tablet":
      return t("device.tablet");
    case "bot":
      return t("device.bot");
    case "unknown":
      return t("device.unknown");
    default:
      return device;
  }
}
