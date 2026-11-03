"use client";

import { useTranslations } from "next-intl";
import { KpiLine } from "@/components/links/stats/kpi-line";
import { formatNumber, formatShare } from "@/lib/utils";
import type { LinkStats } from "@/types";

export function ClickQualitySummary({ data }: { data: LinkStats }) {
  const t = useTranslations("stats.quality");
  const tKpi = useTranslations("stats.kpi");
  if (data.totalClicks === 0) return null;

  const unique = data.uniqueClicks ?? 0;
  const clicksPerUnique = unique === 0 ? 0 : data.humanClicks / unique;
  const windowed = Boolean(data.rawSince && data.rawRetentionDays);

  return (
    <KpiLine
      hero={{ label: tKpi("unique"), value: formatNumber(unique) }}
      metrics={[
        { label: t("clicksPerUnique"), value: clicksPerUnique.toFixed(1) },
        { label: t("returning"), value: formatShare(data.returnRate?.ratio ?? 0) },
        { label: t("previews"), value: formatNumber(data.previewClicks ?? 0), muted: true },
        { label: t("peakHour"), value: data.peakHour != null ? `${String(data.peakHour).padStart(2, "0")}:00` : "—" },
      ]}
      note={windowed ? t("returningWindow", { days: data.rawRetentionDays ?? 0 }) : undefined}
    />
  );
}
