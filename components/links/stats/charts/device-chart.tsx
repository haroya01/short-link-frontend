"use client";

import { useTranslations } from "next-intl";
import type { DeviceClick } from "@/types";
import { formatNumber } from "@/lib/utils";

type Props = { data: DeviceClick[] };

const COLORS = ["#059669", "#047857", "#34D399", "#6EE7B7", "#A7F3D0"];

/**
 * Device split is a composition — "what share of clicks is mobile vs desktop" — so it reads as a
 * single 100% ratio bar with a legend, not a donut. The bar answers the share question at a glance;
 * the legend carries the exact counts + percentages in tabular figures.
 */
export function DeviceChart({ data }: Props) {
  const t = useTranslations("stats");
  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">{t("noData")}</p>;
  }
  const total = data.reduce((acc, d) => acc + d.count, 0) || 1;
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const labelFor = (device: string) => deviceLabel(device, t);

  return (
    <div className="space-y-4">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="img"
        aria-label={sorted
          .map((d) => `${labelFor(d.device)} ${((d.count / total) * 100).toFixed(0)}%`)
          .join(", ")}
      >
        {sorted.map((d, i) => {
          const pct = (d.count / total) * 100;
          return (
            <div
              key={d.device}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
              title={`${labelFor(d.device)} · ${formatNumber(d.count)} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-1">
        {sorted.map((d, i) => (
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
