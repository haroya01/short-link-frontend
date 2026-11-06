"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Breakdown, BreakdownGrid, STAT_HEADING } from "@/components/links/stats/stat-sections";
import { CampaignRows } from "@/components/links/campaigns/campaign-rows";
import { KpiRow, RecommendationList } from "@/components/links/campaigns/stats-cards";
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
import { formatNumber } from "@/lib/utils";
import { fillDailySince } from "@/lib/stats-daily";
import { LinksPage } from "@/components/links/links-page";
import { useSectionLoad } from "@/hooks/use-section-load";

const CAMPAIGN_TIMEZONE = "Asia/Seoul";

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
  const [compareWithId, setCompareWithId] = useState<number | null>(null);
  const [compareData, setCompareData] = useState<CampaignStatsCompareResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareFailed, setCompareFailed] = useState(false);
  const [compareReload, setCompareReload] = useState(0);
  const enabled = ready && authenticated && Number.isFinite(campaignId);
  const others = useSectionLoad(
    enabled,
    useCallback(() => listCampaigns().then((all) => all.filter((it) => it.id !== campaignId)), [campaignId]),
  );
  const rec = useSectionLoad(
    enabled,
    useCallback(() => getCampaignRecommendations(campaignId), [campaignId]),
  );

  useEffect(() => {
    if (!ready || !authenticated || !Number.isFinite(campaignId)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getCampaign(campaignId), getCampaignStats(campaignId)])
      .then(([c, s]) => {
        if (cancelled) return;
        setCampaign(c);
        setStats(s);
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
      setCompareFailed(false);
      return;
    }
    let cancelled = false;
    setCompareLoading(true);
    setCompareFailed(false);
    compareCampaignStats([campaignId, compareWithId])
      .then((data) => {
        if (!cancelled) setCompareData(data);
      })
      .catch(() => {
        if (cancelled) return;
        setCompareData(null);
        setCompareFailed(true);
      })
      .finally(() => {
        if (!cancelled) setCompareLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, compareWithId, compareReload]);

  if (ready && !authenticated) {
    return <SignInEmptyState page reason="stats" />;
  }

  return (
    <LinksPage className="space-y-10">
      <div className="space-y-6">
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
          <KpiRow stats={stats} batchCount={campaign.batchCount} />
        ) : null}
      </div>

      {!loading && !error && stats && campaign && (
        <>
          {stats.byBatch.length === 0 ? (
            <EmptyState
              title={t("byBatch.empty")}
              className="border-t-0 pt-0"
              action={
                <Link href={`/campaigns/${campaignId}/batches/new`} className={buttonVariants({ size: "sm" })}>
                  {t("byBatch.add")}
                </Link>
              }
            />
          ) : (
            <BreakdownGrid>
              <Breakdown title={t("byBatch.title")}>
                <CampaignRows
                  subgrid
                  total={stats.totalClicks}
                  rows={[...stats.byBatch]
                    .sort((a, b) => b.clicks - a.clicks)
                    .map((b) => ({
                      key: b.batchId,
                      label: b.batchName,
                      meta: [b.distributor, b.area, `/${b.shortCode}`].filter(Boolean).join(" · "),
                      clicks: b.clicks,
                      quantity: b.quantity,
                    }))}
                />
              </Breakdown>
              {stats.byDistributor.length > 0 && (
                <Breakdown title={t("groups.distributorTitle")}>
                  <CampaignRows subgrid total={stats.totalClicks} rows={groupRows(stats.byDistributor)} />
                </Breakdown>
              )}
              {stats.byArea.length > 0 && (
                <Breakdown title={t("groups.areaTitle")}>
                  <CampaignRows subgrid total={stats.totalClicks} rows={groupRows(stats.byArea)} />
                </Breakdown>
              )}
            </BreakdownGrid>
          )}
          {rec.data ? (
            <RecommendationList data={rec.data} />
          ) : rec.failed ? (
            <SectionFailure title={t("recommendation.title")} onRetry={rec.retry} />
          ) : null}
          {stats.byDay.length > 0 && <DailyChart data={stats.byDay} startsAt={campaign.startsAt} timezone={stats.timezone ?? CAMPAIGN_TIMEZONE} />}
          {stats.byHour.length > 0 && <HourlyChart data={stats.byHour} heatmap={stats.heatmap} timezone={stats.timezone ?? CAMPAIGN_TIMEZONE} />}
          {others.failed ? (
            <SectionFailure title={t("compare.title")} onRetry={others.retry} />
          ) : others.data && others.data.length > 0 ? (
            <CompareSection
              campaigns={others.data}
              selectedId={compareWithId}
              onSelect={setCompareWithId}
              data={compareData}
              currentId={campaignId}
              loading={compareLoading}
              failed={compareFailed}
              onRetry={() => setCompareReload((n) => n + 1)}
            />
          ) : null}
        </>
      )}
    </LinksPage>
  );
}

function groupRows(groups: CampaignStats["byDistributor"]) {
  return [...groups]
    .sort((a, b) => b.clicks - a.clicks)
    .map((g) => ({ key: g.key, label: g.key, clicks: g.clicks, quantity: g.totalQuantity }));
}

function SectionFailure({ title, onRetry }: { title: string; onRetry: () => void }) {
  const t = useTranslations("campaignApp.campaignStats");
  return (
    <section>
      <h2 className={STAT_HEADING}>{title}</h2>
      <ErrorState message={t("loadFailed")} onRetry={onRetry} />
    </section>
  );
}

function CompareSection({
  campaigns,
  selectedId,
  onSelect,
  data,
  currentId,
  loading,
  failed,
  onRetry,
}: {
  campaigns: CampaignSummary[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  data: CampaignStatsCompareResponse | null;
  currentId: number;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("campaignApp.campaignStats");
  return (
    <section aria-labelledby="campaign-compare">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="campaign-compare" className={STAT_HEADING}>
          {t("compare.title")}
        </h2>
        <Select
          value={selectedId ?? ""}
          onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
          aria-label={t("compare.title")}
          className="h-9 w-auto max-w-full text-[13px] sm:h-9"
        >
          <option value="">{t("compare.none")}</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-3">
        {loading && <p className="text-[13px] text-slate-500 dark:text-slate-400">{t("loading")}</p>}
        {data && !loading && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {data.campaigns.map((c) => {
              const totalQuantity = c.stats.byBatch.reduce((sum, b) => sum + b.quantity, 0);
              const ratePerHundred = totalQuantity > 0 ? (c.stats.totalClicks * 100) / totalQuantity : null;
              return (
                <div key={c.campaignId} className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-slate-900 dark:text-slate-100">{c.name}</p>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">
                    {c.campaignId === currentId ? t("compare.current") : t("compare.comparison")}
                  </p>
                  <dl className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <CompareCell label={t("kpi.totalClicks")} value={formatNumber(c.stats.totalClicks)} />
                    <CompareCell label={t("kpi.perHundred")} value={ratePerHundred === null ? "—" : t("units.rate", { rate: ratePerHundred.toFixed(1) })} />
                    <CompareCell label={t("kpi.topArea")} value={c.stats.byArea[0]?.key ?? "—"} />
                  </dl>
                </div>
              );
            })}
          </div>
        )}
        {failed && !loading && <ErrorState message={t("loadFailed")} onRetry={onRetry} />}
        {!loading && !data && !failed && (
          <p className="text-[13px] text-slate-500 dark:text-slate-400">{t("compare.selectHint")}</p>
        )}
      </div>
    </section>
  );
}

function CompareCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 truncate text-[16px] font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function ChartSection({ id, title, timezone, children }: { id: string; title: string; timezone: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className={STAT_HEADING}>
          {title}
        </h2>
        <span className="shrink-0 text-[12px] text-slate-500 dark:text-slate-400">{timezone}</span>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function DailyChart({ data, startsAt, timezone }: { data: CampaignStats["byDay"]; startsAt: string; timezone: string }) {
  const t = useTranslations("campaignApp.campaignStats");
  const series = useMemo(
    () => fillDailySince(data.map((d) => ({ date: d.day, count: d.clicks })), { from: new Date(startsAt), timezone }),
    [data, startsAt, timezone],
  );
  return (
    <ChartSection id="campaign-daily" title={t("daily.title")} timezone={timezone}>
      <DailyTrendChart data={series} timezone={timezone} compact />
    </ChartSection>
  );
}

function HourlyChart({ data, heatmap, timezone }: { data: CampaignStats["byHour"]; heatmap: CampaignStats["heatmap"]; timezone: string }) {
  const t = useTranslations("campaignApp.campaignStats");
  const series = useMemo(() => data.map((d) => ({ hour: d.hour, count: d.clicks })), [data]);
  const cells = useMemo(() => adaptHeatmap(heatmap), [heatmap]);
  return (
    <ChartSection id="campaign-hourly" title={t("hourly.title")} timezone={timezone}>
      <HourRhythmChart data={series} compact />
      {cells.length > 0 && (
        <>
          <h3 className="mt-8 text-[14px] font-semibold text-slate-900 dark:text-slate-100">{t("heatmap.title")}</h3>
          <div className="mt-3">
            <Heatmap data={cells} />
          </div>
        </>
      )}
    </ChartSection>
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

function StatsSkeleton() {
  return (
    <div className="space-y-6 border-b border-slate-200 pb-6 dark:border-slate-800">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}
