"use client";

import type { ComponentProps } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { HourChart } from "./hour-chart";

// The placeholder matches the chart's height so nothing below moves when the chunk lands.
function ChartPlaceholder({ compact = false }: { compact?: boolean }) {
  return (
    <div className="w-full" aria-hidden>
      <div className={cn(compact ? "h-52" : "h-72", "w-full animate-pulse rounded-lg bg-slate-100/70 dark:bg-slate-800/40")} />
    </div>
  );
}

const loadHour = () => import("./hour-chart").then((m) => m.HourChart);

const HourFull = dynamic(loadHour, { ssr: false, loading: () => <ChartPlaceholder /> });
const HourCompact = dynamic(loadHour, { ssr: false, loading: () => <ChartPlaceholder compact /> });

export function LazyHourChart(props: ComponentProps<typeof HourChart>) {
  return props.compact ? <HourCompact {...props} /> : <HourFull {...props} />;
}
