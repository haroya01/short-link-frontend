"use client";

import { useLocale, useTranslations } from "next-intl";
import type { DailyClick } from "@/types";
import { BarPlot } from "./bar-plot";

function dayLabel(date: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const [, year, month, day] = match.map(Number);
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(
    Date.UTC(year, month - 1, day),
  );
}

export function DailyChart({ data, compact = false, timezone }: { data: DailyClick[]; compact?: boolean; timezone?: string }) {
  const t = useTranslations("stats");
  const locale = useLocale();
  if (data.length === 0) {
    return <p className="py-6 text-[13px] text-slate-500 dark:text-slate-400">{t("noClicks")}</p>;
  }
  const last = data.length - 1;
  const today = timezone ? todayIn(timezone) : null;
  const partial = today !== null && data[last].date === today;
  return (
    <BarPlot
      testId="daily-chart"
      title={t("section.daily.title")}
      points={data.map((d, i) => ({ key: d.date, count: d.count, label: partial && i === last ? t("chart.today") : dayLabel(d.date, locale) }))}
      ticks={[0, last]}
      compact={compact}
      partialLast={partial}
    />
  );
}

function todayIn(timeZone: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  } catch {
    return null;
  }
}
