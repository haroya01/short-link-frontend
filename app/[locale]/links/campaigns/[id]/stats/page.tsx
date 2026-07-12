"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, FlaskConical } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import {
  compareCampaignStats,
  getCampaign,
  getCampaignRecommendations,
  getCampaignStats,
  listCampaigns,
} from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { LinksAuthGate } from "@/components/links/auth-gate";
import { Section } from "@/components/common/section";
import { Heatmap } from "@/components/links/stats/charts/heatmap";
import { DailyChart as DailyTrendChart } from "@/components/links/stats/charts/daily-chart";
import { HourChart as HourRhythmChart } from "@/components/links/stats/charts/hour-chart";
import type { HeatmapCell } from "@/types";
import type {
  CampaignDetail,
  CampaignRecommendation,
  CampaignStats,
  CampaignStatsCompareResponse,
  CampaignSummary,
} from "@/types";

export default function CampaignStatsPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = Number(id);
  const { authenticated, ready } = useAuth();
  const t = useTranslations("campaignApp.campaignStats");
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [otherCampaigns, setOtherCampaigns] = useState<CampaignSummary[]>([]);
  const [compareWithId, setCompareWithId] = useState<number | null>(null);
  const [compareData, setCompareData] = useState<CampaignStatsCompareResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [recData, setRecData] = useState<CampaignRecommendation | null>(null);

  useEffect(() => {
    if (!ready || !authenticated || !Number.isFinite(campaignId)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getCampaign(campaignId),
      getCampaignStats(campaignId),
      listCampaigns(),
      getCampaignRecommendations(campaignId),
    ])
      .then(([c, s, all, rec]) => {
        if (cancelled) return;
        setCampaign(c);
        setStats(s);
        setOtherCampaigns(all.filter((it) => it.id !== campaignId));
        setRecData(rec);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t("loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, campaignId, reload, t]);

  // 비교 대상 캠페인 선택 → compare endpoint 호출. 같은 페이지 안에서 두 캠페인의 핵심 KPI 를
  // side-by-side 로 본다 (전체 차트 비교는 후속 PR).
  useEffect(() => {
    if (!compareWithId) {
      setCompareData(null);
      return;
    }
    let cancelled = false;
    setCompareLoading(true);
    compareCampaignStats([campaignId, compareWithId])
      .then((data) => {
        if (!cancelled) setCompareData(data);
      })
      .catch(() => {
        if (!cancelled) setCompareData(null);
      })
      .finally(() => {
        if (!cancelled) setCompareLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, compareWithId]);

  if (ready && !authenticated) {
    return <LinksAuthGate eyebrow="campaigns" title={t("loginRequired")} />;
  }

  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <Link
        href={`/campaigns/${campaignId}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {t("backToCampaign")}
      </Link>

      <div>
        <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
          {t("title")}
        </h1>
        {/* div, not p: the loading Skeleton renders a block element, and a block inside a <p> is
            invalid HTML that trips a hydration mismatch (which reset the no-FOUC dark class). */}
        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {loading ? (
            <Skeleton className="inline-block h-4 w-40" />
          ) : campaign ? (
            <>
              {t.rich("introCampaign", {
                name: () => <span className="font-medium text-slate-700 dark:text-slate-300">{campaign.name}</span>,
              })}
            </>
          ) : null}
        </div>
      </div>

      {loading ? (
        <StatsSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
      ) : stats && campaign ? (
        <>
          <KpiRow stats={stats} batchCount={campaign.batchCount} />
          {stats.testScans > 0 && (
            <TestScansCard count={stats.testScans} lastAt={stats.lastTestScanAt} />
          )}
          <ByBatchTable stats={stats} />
          {stats.byDistributor.length > 0 && (
            <GroupChart
              title={t("groups.distributorTitle")}
              hint={t("groups.distributorHint")}
              groups={stats.byDistributor}
            />
          )}
          {stats.byArea.length > 0 && (
            <GroupChart
              title={t("groups.areaTitle")}
              hint={t("groups.areaHint")}
              groups={stats.byArea}
            />
          )}
          {recData && <RecommendationCard data={recData} />}
          {stats.byDay.length > 0 && <DailyChart data={stats.byDay} />}
          {stats.byHour.length > 0 && <HourlyChart data={stats.byHour} />}
          {stats.heatmap.length > 0 && <HeatmapChart data={stats.heatmap} />}
          {otherCampaigns.length > 0 && (
            <CompareSection
              campaigns={otherCampaigns}
              selectedId={compareWithId}
              onSelect={setCompareWithId}
              data={compareData}
              currentId={campaignId}
              loading={compareLoading}
            />
          )}
        </>
      ) : null}
    </div>
  );
}

function CompareSection({
  campaigns,
  selectedId,
  onSelect,
  data,
  currentId,
  loading,
}: {
  campaigns: CampaignSummary[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  data: CampaignStatsCompareResponse | null;
  currentId: number;
  loading: boolean;
}) {
  const t = useTranslations("campaignApp.campaignStats");
  return (
    <Section
      title={t("compare.title")}
      description={t("compare.description")}
      action={
        <select
          value={selectedId ?? ""}
          onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-[12px] text-slate-700 dark:text-slate-300"
        >
          <option value="">{t("compare.none")}</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      }
    >
      {loading && <p className="text-[12px] text-slate-500 dark:text-slate-400">{t("loading")}</p>}
      {data && !loading && (
        <div className="grid grid-cols-2 gap-3">
          {data.campaigns.map((c) => {
            const isCurrent = c.campaignId === currentId;
            const totalQuantity = c.stats.byBatch.reduce((sum, b) => sum + b.quantity, 0);
            const ratePerHundred =
              totalQuantity > 0 ? (c.stats.totalClicks * 100) / totalQuantity : 0;
            const topArea = c.stats.byArea[0]?.key ?? "—";
            return (
              <div
                key={c.campaignId}
                className={
                  "rounded-xl border p-3 " +
                  (isCurrent
                    ? "border-accent-200 bg-accent-50/40 dark:bg-accent-600/10"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40")
                }
              >
                <p className="truncate text-[12px] font-semibold text-slate-900 dark:text-slate-100">{c.name}</p>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  {isCurrent ? t("compare.current") : t("compare.comparison")}
                </p>
                <dl className="mt-2.5 grid grid-cols-3 gap-2">
                  <CompareCell label={t("kpi.totalClicks")} value={c.stats.totalClicks.toLocaleString()} />
                  <CompareCell label={t("kpi.perHundred")} value={ratePerHundred.toFixed(1)} />
                  <CompareCell label={t("kpi.topArea")} value={topArea} />
                </dl>
              </div>
            );
          })}
        </div>
      )}
      {!loading && !data && (
        <p className="text-[12px] text-slate-500 dark:text-slate-400">
          {t("compare.selectHint")}
        </p>
      )}
    </Section>
  );
}

function RecommendationCard({ data }: { data: CampaignRecommendation }) {
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
        total: data.totalQuantity.toLocaleString(),
        average: data.avgRatePerHundred.toFixed(1),
      })}
      footnote={t("recommendation.footnote")}
    >
      <ul className="divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
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
            current: rec.currentQuantity.toLocaleString(),
            recommended: rec.recommendedQuantity.toLocaleString(),
            rate: rec.currentRatePerHundred.toFixed(1),
          })}
        </p>
      </div>
      <span
        className={
          "flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
          verdictStyle[rec.verdict]
        }
      >
        {verdictLabel[rec.verdict]}
      </span>
      <span className={"tabular-nums text-[14px] font-semibold " + deltaColor}>
        {deltaSign}
        {rec.delta.toLocaleString()}
      </span>
    </li>
  );
}

function CompareCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 truncate text-[15px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </dd>
    </div>
  );
}

function DailyChart({ data }: { data: CampaignStats["byDay"] }) {
  const t = useTranslations("campaignApp.campaignStats");
  // Daily volume is a trend, so it reuses the link-stats area chart (line + faint fill + peak dot)
  // instead of a bar row — same reading language across the whole product.
  const series = useMemo(() => data.map((d) => ({ date: d.day, count: d.clicks })), [data]);
  return (
    <Section title={t("daily.title")} description={t("daily.description")}>
      <DailyTrendChart data={series} />
    </Section>
  );
}

function HourlyChart({ data }: { data: CampaignStats["byHour"] }) {
  const t = useTranslations("campaignApp.campaignStats");
  // Hour-of-day is a continuous rhythm → the shared curve (it fills the empty 0–23 hours itself).
  const series = useMemo(() => data.map((d) => ({ hour: d.hour, count: d.clicks })), [data]);
  return (
    <Section title={t("hourly.title")} description={t("hourly.description")}>
      <HourRhythmChart data={series} />
    </Section>
  );
}

// SQL DAYOFWEEK 가 1=Sunday, 7=Saturday. 공용 Heatmap 의 DAYS 배열은
// ["MONDAY", ..., "SUNDAY"] string. 매핑.
const DAYOFWEEK_TO_DAY: string[] = [
  "",
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function adaptHeatmap(cells: CampaignStats["heatmap"]): HeatmapCell[] {
  return cells.map((c) => ({
    dayOfWeek: DAYOFWEEK_TO_DAY[c.dayOfWeek] ?? "MONDAY",
    hour: c.hour,
    count: c.clicks,
  }));
}

function HeatmapChart({ data }: { data: CampaignStats["heatmap"] }) {
  const t = useTranslations("campaignApp.campaignStats");
  const adapted = useMemo(() => adaptHeatmap(data), [data]);
  return (
    <Section title={t("heatmap.title")} description={t("heatmap.description")}>
      <Heatmap data={adapted} />
    </Section>
  );
}

function KpiRow({ stats, batchCount }: { stats: CampaignStats; batchCount: number }) {
  const t = useTranslations("campaignApp.campaignStats");
  const totalQuantity = useMemo(
    () => stats.byBatch.reduce((sum, b) => sum + b.quantity, 0),
    [stats.byBatch],
  );
  const ratePerHundred = totalQuantity > 0 ? (stats.totalClicks * 100) / totalQuantity : 0;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Kpi label={t("kpi.totalClicks")} value={stats.totalClicks.toLocaleString()} />
      <Kpi label={t("kpi.batches")} value={t("units.count", { count: batchCount })} />
      <Kpi
        label={t("kpi.totalDistributed")}
        value={t("units.sheets", { count: totalQuantity.toLocaleString() })}
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
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
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

function TestScansCard({ count, lastAt }: { count: number; lastAt: string | null }) {
  const t = useTranslations("campaignApp.campaignStats");
  const locale = useLocale();
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-4">
      <div className="flex items-start gap-2">
        <FlaskConical className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
        <div className="flex-1">
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            {t("testScans.title")}
          </p>
          <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300">
            {t.rich("testScans.description", {
              count: count.toLocaleString(),
              strong: (chunks) => <span className="font-medium text-slate-900 dark:text-slate-100">{chunks}</span>,
            })}
          </p>
          {lastAt && (
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              {t("testScans.last", { date: new Date(lastAt).toLocaleString(locale) })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ByBatchTable({ stats }: { stats: CampaignStats }) {
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
                    {b.clicks.toLocaleString()}
                  </span>
                  <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                    {t("byBatch.meta", {
                      quantity: b.quantity.toLocaleString(),
                      rate: ratePerHundred.toFixed(1),
                    })}
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-accent-600 transition-all duration-500"
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

function GroupChart({
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
                      clicks: g.clicks.toLocaleString(),
                      quantity: g.totalQuantity.toLocaleString(),
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

function StatsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-60 w-full rounded-2xl" />
    </div>
  );
}
