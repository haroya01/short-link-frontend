"use client";

import dynamic from "next/dynamic";
import type { DailyPoint } from "@/modules/blog/api/analytics";

/** Fixed-height (h-64) placeholder while the recharts chunk loads — same box as the chart, so the
 *  dashboard doesn't jump when it hydrates in. */
function ChartSkeleton() {
  return (
    <div className="h-64 w-full animate-pulse rounded-lg bg-slate-100/70 dark:bg-slate-800/40" aria-hidden />
  );
}

/**
 * Public entry for the analytics view-over-time chart. Splits the heavy recharts bundle out of the
 * analytics pages' first load via next/dynamic (ssr:false — the chart is client-only and author-gated),
 * showing {@link ChartSkeleton} at the chart's exact height meanwhile so there's no layout shift.
 */
const AnalyticsAreaChartLazy = dynamic(
  () => import("./analytics-area-chart-impl").then((m) => m.AnalyticsAreaChartImpl),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export function AnalyticsAreaChart({ data }: { data: DailyPoint[] }) {
  return <AnalyticsAreaChartLazy data={data} />;
}
