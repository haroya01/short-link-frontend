"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, FlaskConical } from "lucide-react";
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
import { ByBatchTable, GroupChart, KpiRow, RecommendationCard } from "@/components/links/campaigns/stats-cards";
import { Heatmap } from "@/components/links/stats/charts/heatmap";
import {
  LazyDailyChart as DailyTrendChart,
  LazyHourChart as HourRhythmChart,
} from "@/components/links/stats/charts/lazy-charts";
import type { HeatmapCell } from "@/types";
import type {
  CampaignDetail,
  CampaignRecommendation,
  CampaignStats,
  CampaignStatsCompareResponse,
  CampaignSummary,
} from "@/types";
import { formatNumber, formatDateTime } from "@/lib/utils";

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
      .catch(() => {
        if (!cancelled) setError(t("loadFailed"));
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
    return <LinksAuthGate title={t("loginRequired")} />;
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
                  "rounded-lg border p-3 " +
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
                  <CompareCell label={t("kpi.totalClicks")} value={formatNumber(c.stats.totalClicks)} />
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
              count: formatNumber(count),
              strong: (chunks) => <span className="font-medium text-slate-900 dark:text-slate-100">{chunks}</span>,
            })}
          </p>
          {lastAt && (
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              {t("testScans.last", { date: formatDateTime(lastAt) })}
            </p>
          )}
        </div>
      </div>
    </div>
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
