"use client";

import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Section } from "@/components/common/section";
import type { CampaignRecommendation, CampaignStats } from "@/types";
import { formatNumber } from "@/lib/utils";

export function RecommendationCard({ data }: { data: CampaignRecommendation }) {
  const t = useTranslations("campaignApp.campaignStats");
  if (data.insufficient) {
    return (
      <Section title={t("recommendation.title")}>
        <p className="text-[12px] text-slate-500 dark:text-slate-400">{data.insufficientReason}</p>
      </Section>
    );
  }

  return (
    <Section
      title={t("recommendation.title")}
      description={t("recommendation.description", {
        total: formatNumber(data.totalQuantity),
        average: data.avgRatePerHundred.toFixed(1),
      })}
      footnote={t("recommendation.footnote")}
    >
      <ul className="divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {data.recommendations.map((r) => (
          <RecRow key={r.batchId} rec={r} />
        ))}
      </ul>
    </Section>
  );
}

function RecRow({ rec }: { rec: CampaignRecommendation["recommendations"][number] }) {
  const t = useTranslations("campaignApp.campaignStats");
  const verdictStyle: Record<string, string> = {
    BOOST: "bg-accent-100 dark:bg-accent-600/10 text-accent-700 dark:text-accent-400",
    KEEP: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    REDUCE: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
    PRUNE: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400",
  };
  const verdictLabel: Record<string, string> = {
    BOOST: t("recommendation.verdict.BOOST"),
    KEEP: t("recommendation.verdict.KEEP"),
    REDUCE: t("recommendation.verdict.REDUCE"),
    PRUNE: t("recommendation.verdict.PRUNE"),
  };
  const deltaSign = rec.delta > 0 ? "+" : "";
  const deltaColor =
    rec.delta > 0 ? "text-accent-700 dark:text-accent-400" : rec.delta < 0 ? "text-rose-600" : "text-slate-500 dark:text-slate-400";
  return (
    <li className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-slate-900 dark:text-slate-100">{rec.batchName}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
          {t("recommendation.rowMeta", {
            current: formatNumber(rec.currentQuantity),
            recommended: formatNumber(rec.recommendedQuantity),
            rate: rec.currentRatePerHundred.toFixed(1),
          })}
        </p>
      </div>
      <span
        className={
          "flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold " +
          verdictStyle[rec.verdict]
        }
      >
        {verdictLabel[rec.verdict]}
      </span>
      <span className={"tabular-nums text-[14px] font-semibold " + deltaColor}>
        {deltaSign}
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
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Kpi label={t("kpi.totalClicks")} value={formatNumber(stats.totalClicks)} />
      <Kpi label={t("kpi.batches")} value={t("units.count", { count: batchCount })} />
      <Kpi
        label={t("kpi.totalDistributed")}
        value={t("units.sheets", { count: formatNumber(totalQuantity) })}
      />
      <Kpi
        label={t("kpi.perHundred")}
        value={ratePerHundred.toFixed(1)}
        accent
        hint={t("kpi.perHundredHint")}
      />
    </ul>
  );
}

function Kpi({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <li
      className={
        "rounded-2xl border bg-white dark:bg-slate-900 px-4 py-4 " +
        (accent ? "border-accent-200 bg-accent-50/40 dark:bg-accent-600/10" : "border-slate-200 dark:border-slate-800")
      }
    >
      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={
          "mt-2 text-[24px] font-semibold leading-tight tracking-headline " +
          (accent ? "text-accent-700 dark:text-accent-400" : "text-slate-900 dark:text-slate-100")
        }
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{hint}</p>}
    </li>
  );
}

export function ByBatchTable({ stats }: { stats: CampaignStats }) {
  const t = useTranslations("campaignApp.campaignStats");
  const sorted = useMemo(
    () => [...stats.byBatch].sort((a, b) => b.clicks - a.clicks),
    [stats.byBatch],
  );
  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-10 text-center text-[12px] text-slate-500 dark:text-slate-400">
        {t("byBatch.empty")}
      </div>
    );
  }
  const maxClicks = sorted[0]?.clicks ?? 0;
  return (
    <Section
      title={t("byBatch.title")}
      description={t("byBatch.description")}
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {sorted.map((b) => {
          const widthPct = maxClicks > 0 ? (b.clicks * 100) / maxClicks : 0;
          const ratePerHundred = b.quantity > 0 ? (b.clicks * 100) / b.quantity : 0;
          return (
            <li key={b.batchId} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{b.batchName}</p>
                  <p className="mt-0.5 truncate text-[12px] text-slate-500 dark:text-slate-400">
                    {[b.distributor, b.area].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-baseline gap-3 text-right">
                  <span className="text-[15px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatNumber(b.clicks)}
                  </span>
                  <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                    {t("byBatch.meta", {
                      quantity: formatNumber(b.quantity),
                      rate: ratePerHundred.toFixed(1),
                    })}
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-accent-600 transition-[width] duration-500 ease-[var(--ease)]"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-end">
                <a
                  href={`https://kurl.md/${b.shortCode}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-slate-400 hover:text-accent-700 hover:underline"
                >
                  /{b.shortCode}
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export function GroupChart({
  title,
  hint,
  groups,
}: {
  title: string;
  hint: string;
  groups: CampaignStats["byDistributor"];
}) {
  const t = useTranslations("campaignApp.campaignStats");
  // Efficiency ranking (clicks per 100 sheets) reads as a text + fill-bar list — same language as
  // ByBatchTable right above it, and it renders correctly in dark mode (the old recharts axes were
  // pinned to light-mode slate hex and went near-invisible on a dark card).
  const rows = useMemo(
    () => [...groups].sort((a, b) => b.clickRatePerHundred - a.clickRatePerHundred),
    [groups],
  );
  const max = Math.max(...rows.map((g) => g.clickRatePerHundred), 1);
  return (
    <Section title={title} description={hint} bodyClassName="p-0">
      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {rows.map((g) => {
          const widthPct = (g.clickRatePerHundred / max) * 100;
          return (
            <li key={g.key} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {g.key}
                </p>
                <div className="flex flex-shrink-0 items-baseline gap-3 text-right">
                  <span className="text-[15px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {g.clickRatePerHundred.toFixed(1)}
                  </span>
                  <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                    {t("groups.meta", {
                      clicks: formatNumber(g.clicks),
                      quantity: formatNumber(g.totalQuantity),
                    })}
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-accent-600"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
