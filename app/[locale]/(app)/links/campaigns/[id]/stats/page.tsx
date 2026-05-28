"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, FlaskConical } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { Section } from "@/components/common/section";
import { Heatmap } from "@/components/links/stats/charts/heatmap";
import type { HeatmapCell } from "@/types";
import type {
  CampaignDetail,
  CampaignRecommendation,
  CampaignStats,
  CampaignStatsCompareResponse,
  CampaignSummary,
} from "@/types";

const ACCENT = "#059669";
const ACCENT_LIGHT = "#a7f3d0";

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
    return (
      <div className="container max-w-md py-20 text-center">
        <h1 className="text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[30px]">
          {t("loginRequired")}
        </h1>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <Link
        href={`/campaigns/${campaignId}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {t("backToCampaign")}
      </Link>

      <div>
        <h1 className="text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[30px]">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {loading ? (
            <Skeleton className="inline-block h-4 w-40" />
          ) : campaign ? (
            <>
              {t.rich("introCampaign", {
                name: () => <span className="font-medium text-slate-700">{campaign.name}</span>,
              })}
            </>
          ) : null}
        </p>
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
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700"
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
      {loading && <p className="text-[12px] text-slate-500">{t("loading")}</p>}
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
                    ? "border-accent-200 bg-accent-50/40"
                    : "border-slate-200 bg-slate-50/40")
                }
              >
                <p className="truncate text-[12px] font-semibold text-slate-900">{c.name}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">
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
        <p className="text-[12px] text-slate-500">
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
        <p className="text-[12px] text-slate-500">{data.insufficientReason}</p>
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
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
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
    BOOST: "bg-accent-100 text-accent-700",
    KEEP: "bg-slate-100 text-slate-700",
    REDUCE: "bg-amber-50 text-amber-700",
    PRUNE: "bg-rose-50 text-rose-700",
  };
  const verdictLabel: Record<string, string> = {
    BOOST: t("recommendation.verdict.BOOST"),
    KEEP: t("recommendation.verdict.KEEP"),
    REDUCE: t("recommendation.verdict.REDUCE"),
    PRUNE: t("recommendation.verdict.PRUNE"),
  };
  const deltaSign = rec.delta > 0 ? "+" : "";
  const deltaColor =
    rec.delta > 0 ? "text-accent-700" : rec.delta < 0 ? "text-rose-600" : "text-slate-500";
  return (
    <li className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-slate-900">{rec.batchName}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
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
      <dt className="text-[9px] font-medium uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate text-[15px] font-semibold tabular-nums text-slate-900">
        {value}
      </dd>
    </div>
  );
}

function DailyChart({ data }: { data: CampaignStats["byDay"] }) {
  const t = useTranslations("campaignApp.campaignStats");
  const max = useMemo(() => Math.max(...data.map((d) => d.clicks), 1), [data]);
  return (
    <Section title={t("daily.title")} description={t("daily.description")}>
      <div className="flex h-32 items-end gap-1">
        {data.map(({ day, clicks }) => {
          const heightPct = (clicks / max) * 100;
          return (
            <div key={day} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-slate-500">{clicks}</span>
              <div
                className="w-full rounded-t-sm bg-accent-500"
                style={{ height: `${heightPct}%` }}
                title={`${day}: ${clicks}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] tabular-nums text-slate-500">
        <span>{data[0]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
    </Section>
  );
}

function HourlyChart({ data }: { data: CampaignStats["byHour"] }) {
  const t = useTranslations("campaignApp.campaignStats");
  // 0–23 시간대 채움 — 클릭 없는 시간대도 빈 bar 로 보여서 분포 의미 명확.
  const full = useMemo(() => {
    const map = new Map(data.map((d) => [d.hour, d.clicks]));
    return Array.from({ length: 24 }, (_, h) => ({ hour: h, clicks: map.get(h) ?? 0 }));
  }, [data]);
  const max = Math.max(...full.map((d) => d.clicks), 1);

  return (
    <Section title={t("hourly.title")} description={t("hourly.description")}>
      <div
        className="grid h-28 items-end gap-0.5"
        style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
      >
        {full.map(({ hour, clicks }) => {
          const heightPct = (clicks / max) * 100;
          return (
            <div
              key={hour}
              className="rounded-t-sm bg-accent-500"
              style={{ height: `${Math.max(heightPct, 2)}%` }}
              title={t("hourly.tooltip", { hour, clicks })}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] tabular-nums text-slate-500">
        <span>0</span>
        <span>6</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
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
        "rounded-2xl border bg-white px-4 py-4 " +
        (accent ? "border-accent-200 bg-accent-50/40" : "border-slate-200")
      }
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={
          "mt-2 text-[24px] font-semibold leading-tight tracking-headline " +
          (accent ? "text-accent-700" : "text-slate-900")
        }
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[11px] leading-snug text-slate-500">{hint}</p>}
    </li>
  );
}

function TestScansCard({ count, lastAt }: { count: number; lastAt: string | null }) {
  const t = useTranslations("campaignApp.campaignStats");
  const locale = useLocale();
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-start gap-2">
        <FlaskConical className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" aria-hidden />
        <div className="flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            {t("testScans.title")}
          </p>
          <p className="mt-1.5 text-sm text-slate-700">
            {t.rich("testScans.description", {
              count: count.toLocaleString(),
              strong: (chunks) => <span className="font-medium text-slate-900">{chunks}</span>,
            })}
          </p>
          {lastAt && (
            <p className="mt-0.5 text-[12px] text-slate-500">
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
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-[12px] text-slate-500">
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
      <ul className="divide-y divide-slate-200">
        {sorted.map((b) => {
          const widthPct = maxClicks > 0 ? (b.clicks * 100) / maxClicks : 0;
          const ratePerHundred = b.quantity > 0 ? (b.clicks * 100) / b.quantity : 0;
          return (
            <li key={b.batchId} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{b.batchName}</p>
                  <p className="mt-0.5 truncate text-[12px] text-slate-500">
                    {[b.distributor, b.area].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-baseline gap-3 text-right">
                  <span className="text-[15px] font-semibold tabular-nums text-slate-900">
                    {b.clicks.toLocaleString()}
                  </span>
                  <span className="text-[11px] tabular-nums text-slate-500">
                    {t("byBatch.meta", {
                      quantity: b.quantity.toLocaleString(),
                      rate: ratePerHundred.toFixed(1),
                    })}
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
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
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 hover:text-accent-700 hover:underline"
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
  const data = useMemo(
    () =>
      [...groups]
        .sort((a, b) => b.clickRatePerHundred - a.clickRatePerHundred)
        .map((g) => ({
          key: g.key,
          ratePerHundred: Number(g.clickRatePerHundred.toFixed(2)),
          clicks: g.clicks,
          quantity: g.totalQuantity,
        })),
    [groups],
  );
  return (
    <Section title={title} description={hint}>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="key"
              tick={{ fontSize: 12, fill: "#0f172a" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
              width={100}
            />
            <Tooltip
              cursor={{ fill: ACCENT_LIGHT, opacity: 0.3 }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 12,
                padding: "8px 12px",
              }}
              formatter={(_value: number, _name: string, item) => {
                const row = item?.payload as {
                  ratePerHundred: number;
                  clicks: number;
                  quantity: number;
                };
                return [
                  t("groups.tooltip", {
                    rate: row.ratePerHundred,
                    clicks: row.clicks.toLocaleString(),
                    quantity: row.quantity.toLocaleString(),
                  }),
                  t("groups.efficiency"),
                ];
              }}
            />
            <Bar dataKey="ratePerHundred" fill={ACCENT} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
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
