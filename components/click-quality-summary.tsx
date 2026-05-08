"use client";

import { useTranslations } from "next-intl";
import type { LinkStats } from "@/types";

/**
 * Compact \"how is this link being used\" summary that distills the data the page already has into
 * the four numbers people actually look at: returning ratio, clicks per unique, peak hour, and
 * social-preview hits separated from real clicks.
 */
export function ClickQualitySummary({ data }: { data: LinkStats }) {
  const t = useTranslations("stats.quality");
  const total = data.totalClicks;
  if (total === 0) return null;

  const newCount = data.returnRate?.newVisitors ?? 0;
  const returningCount = data.returnRate?.returningVisitors ?? 0;
  const uniqueDenom = newCount + returningCount;
  const clicksPerUnique = uniqueDenom === 0 ? 0 : data.humanClicks / uniqueDenom;
  const returningRatio = data.returnRate?.ratio ?? 0;
  const previewClicks = data.previewClicks ?? 0;
  const realClicks = data.humanClicks;
  const previewRatio = total === 0 ? 0 : previewClicks / total;

  const cards: { label: string; value: string; hint?: string }[] = [
    {
      label: t("returning"),
      value: formatPct(returningRatio),
      hint: t("returningHint", { count: returningCount }),
    },
    {
      label: t("clicksPerUnique"),
      value: clicksPerUnique.toFixed(1),
      hint: t("clicksPerUniqueHint", { unique: uniqueDenom }),
    },
    {
      label: t("realVsPreview"),
      value: `${realClicks} / ${previewClicks}`,
      hint: t("realVsPreviewHint", { ratio: formatPct(previewRatio) }),
    },
    {
      label: t("peakHour"),
      value: data.peakHour != null ? `${String(data.peakHour).padStart(2, "0")}:00` : "—",
      hint: data.peakHour != null ? t("peakHourHint") : t("peakHourEmpty"),
    },
  ];

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{t("title")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-md border border-slate-200 bg-white px-4 py-3"
          >
            <div className="text-[11px] uppercase tracking-wider text-slate-500">{c.label}</div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
              {c.value}
            </div>
            {c.hint && <div className="mt-1 text-[11px] text-slate-500">{c.hint}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

function formatPct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}
