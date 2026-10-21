"use client";

import type { ComponentProps } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { DailyChart } from "./daily-chart";
import type { HourChart } from "./hour-chart";

// The placeholder matches the chart's height (peak line + track) so nothing below moves when the chunk lands.
function ChartPlaceholder({ peakLine = false, compact = false }: { peakLine?: boolean; compact?: boolean }) {
  return (
    <div className="w-full" aria-hidden>
      {peakLine && <p className="mb-2 text-[11px]">{" "}</p>}
      <div className={cn(compact ? "h-52" : "h-72", "w-full animate-pulse rounded-lg bg-slate-100/70 dark:bg-slate-800/40")} />
    </div>
  );
}

const loadDaily = () => import("./daily-chart").then((m) => m.DailyChart);
const loadHour = () => import("./hour-chart").then((m) => m.HourChart);

const DailyFull = dynamic(loadDaily, { ssr: false, loading: () => <ChartPlaceholder peakLine /> });
const DailyCompact = dynamic(loadDaily, { ssr: false, loading: () => <ChartPlaceholder peakLine compact /> });
const HourFull = dynamic(loadHour, { ssr: false, loading: () => <ChartPlaceholder /> });
const HourCompact = dynamic(loadHour, { ssr: false, loading: () => <ChartPlaceholder compact /> });

export function LazyDailyChart(props: ComponentProps<typeof DailyChart>) {
  return props.compact ? <DailyCompact {...props} /> : <DailyFull {...props} />;
}

export function LazyHourChart(props: ComponentProps<typeof HourChart>) {
  return props.compact ? <HourCompact {...props} /> : <HourFull {...props} />;
}
