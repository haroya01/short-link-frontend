"use client";

import { useTranslations } from "next-intl";
import type { HourClick } from "@/types";
import { BarPlot } from "./bar-plot";

export function HourChart({ data, compact = false }: { data: HourClick[]; compact?: boolean }) {
  const t = useTranslations("stats");
  const counts = new Map(data.map((d) => [d.hour, d.count]));
  const points = Array.from({ length: 24 }, (_, hour) => ({
    key: String(hour),
    count: counts.get(hour) ?? 0,
    label: t("chart.hour", { hour }),
  }));
  if (points.every((p) => p.count === 0)) {
    return <p className="py-6 text-[13px] text-slate-500 dark:text-slate-400">{t("noClicks")}</p>;
  }
  return (
    <BarPlot
      testId="hour-chart"
      title={t("section.hourly.title")}
      points={points}
      ticks={[0, 6, 12, 18, 23]}
      compact={compact}
    />
  );
}
