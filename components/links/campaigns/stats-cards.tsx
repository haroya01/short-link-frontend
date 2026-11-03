"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { KpiLine } from "@/components/links/stats/kpi-line";
import { STAT_HEADING } from "@/components/links/stats/stat-heading";
import type { CampaignRecommendation, CampaignStats } from "@/types";
import { cn, formatNumber } from "@/lib/utils";

export function RecommendationList({ data }: { data: CampaignRecommendation }) {
  const t = useTranslations("campaignApp.campaignStats");
  return (
    <section aria-labelledby="campaign-recommendation">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="campaign-recommendation" className={STAT_HEADING}>
          {t("recommendation.title")}
        </h2>
        {!data.insufficient && (
          <span className="shrink-0 text-[12px] text-slate-500 dark:text-slate-400">
            {t("recommendation.aside", { total: formatNumber(data.totalQuantity), average: data.avgRatePerHundred.toFixed(1) })}
          </span>
        )}
      </div>
      {data.insufficient ? (
        <p className="mt-3 text-[13px] text-slate-500 dark:text-slate-400">
          {data.insufficientCode === "TOO_FEW_BATCHES"
            ? t("recommendation.tooFewBatches", { minimum: data.insufficientMinimum ?? 2, current: data.insufficientCurrent ?? 0 })
            : data.insufficientCode === "TOO_FEW_CLICKS"
              ? t("recommendation.tooFewClicks", { minimum: data.insufficientMinimum ?? 10, current: data.insufficientCurrent ?? 0 })
              : data.insufficientReason}
        </p>
      ) : (
        <>
          <ul className="mt-3 space-y-3">
            {data.recommendations.map((r) => (
              <RecRow key={r.batchId} rec={r} />
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-slate-500 dark:text-slate-400">{t("recommendation.footnote")}</p>
        </>
      )}
    </section>
  );
}

function RecRow({ rec }: { rec: CampaignRecommendation["recommendations"][number] }) {
  const t = useTranslations("campaignApp.campaignStats");
  const sign = rec.delta > 0 ? "+" : "";
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-4">
      <div className="min-w-0">
        <p className="truncate text-[14px] text-slate-900 dark:text-slate-100">{rec.batchName}</p>
        <p className="mt-0.5 truncate text-[12px] tabular-nums text-slate-500 dark:text-slate-400">
          {t("recommendation.rowMeta", {
            current: formatNumber(rec.currentQuantity),
            recommended: formatNumber(rec.recommendedQuantity),
            rate: rec.currentRatePerHundred.toFixed(1),
          })}
        </p>
      </div>
      <span className="text-[12px] text-slate-500 dark:text-slate-400">{t(`recommendation.verdict.${rec.verdict}`)}</span>
      <span
        className={cn(
          "text-right text-[13px] font-semibold tabular-nums",
          rec.delta < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100",
        )}
      >
        {sign}
        {formatNumber(rec.delta)}
      </span>
    </li>
  );
}

export function KpiRow({ stats, batchCount }: { stats: CampaignStats; batchCount: number }) {
  const t = useTranslations("campaignApp.campaignStats");
  const totalQuantity = useMemo(
    () => stats.byBatch.reduce((sum, b) => sum + b.quantity, 0),
    [stats.byBatch],
  );
  const ratePerHundred = totalQuantity > 0 ? (stats.totalClicks * 100) / totalQuantity : 0;
  return (
    <KpiLine
      hero={{ label: t("kpi.totalClicks"), value: formatNumber(stats.totalClicks) }}
      metrics={[
        { label: t("kpi.perHundred"), value: totalQuantity > 0 ? t("units.rate", { rate: ratePerHundred.toFixed(1) }) : "—" },
        { label: t("kpi.batches"), value: t("units.count", { count: batchCount }) },
        { label: t("kpi.totalDistributed"), value: t("units.sheets", { count: formatNumber(totalQuantity) }) },
      ]}
      note={stats.testScans > 0 ? t("testScans.note", { count: formatNumber(stats.testScans) }) : undefined}
    />
  );
}
