"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import { ChannelDepthTable } from "@/components/links/stats/channel-depth-table";
import { DeviceChart } from "@/components/links/stats/charts/device-chart";
import { ClientAppBreakdown } from "@/components/links/stats/labeled-breakdowns";
import { Sparkline } from "@/components/links/stats/sparkline";
import { DailyChart } from "@/components/links/stats/charts/daily-chart";
import { HourChart } from "@/components/links/stats/charts/hour-chart";
import { journalEntries, type JournalEntry } from "@/lib/stats-journal";
import { cn, formatNumber } from "@/lib/utils";
import { countryItems } from "@/components/links/stats/stat-sections";
import { sourceBreakdown } from "@/lib/stats-sources";
import { useStatsLabels, type StatsLabels } from "@/lib/stats-labels";
import type { LinkStats } from "@/types";

function EvidenceNumbers({ items }: { items: { label: string; value: number }[] }) {
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{item.label}</dt>
          <dd className="mt-1 text-[16px] font-bold leading-none tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
            {formatNumber(item.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function EvidenceBody({ entry, data }: { entry: JournalEntry; data: LinkStats }) {
  const t = useTranslations("stats");
  const labels = useStatsLabels();
  const counts = (data.dailyClicks ?? []).map((d) => d.count);
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
  switch (entry.key) {
    case "velocity":
      return (
        <EvidenceNumbers
          items={[
            { label: t("journal.lastHour"), value: data.velocity?.currentHour ?? 0 },
            { label: t("journal.hourlyAverage"), value: Math.round(data.velocity?.baselinePerHour ?? 0) },
          ]}
        />
      );
    case "trendUp":
    case "trendDown":
      return (
        <EvidenceNumbers
          items={[
            { label: t("journal.last7"), value: sum(counts.slice(-7)) },
            { label: t("journal.prev7"), value: sum(counts.slice(-14, -7)) },
          ]}
        />
      );
    case "peakDay":
      return (
        <EvidenceNumbers
          items={[
            { label: t("journal.peakDayCount"), value: Math.max(0, ...counts) },
            { label: t("journal.dailyAverage", { days: counts.length }), value: Math.round(counts.length ? sum(counts) / counts.length : 0) },
          ]}
        />
      );
    case "fastFirstClick":
      return null;
  }
  switch (entry.evidence) {
    case "section-daily":
      return <DailyChart data={data.dailyClicks ?? []} compact />;
    case "section-hourly":
      return <HourChart data={data.hourClicks ?? []} compact />;
    case "section-sources":
      return <BreakdownList {...sourceBreakdown(data, labels.channel("direct"))} maxItems={5} />;
    case "section-device":
      return <DeviceChart data={data.deviceClicks ?? []} />;
    case "section-bots": {
      const bots = data.botClicks2 ?? [];
      if (bots.length > 0) {
        return (
          <BreakdownList items={bots.map((b) => ({ label: labels.bot(b.bot), count: b.count }))} maxItems={5} />
        );
      }
      // 봇 분류가 없으면 사람/봇 비중 자체가 근거다.
      return (
        <BreakdownList
          items={[
            { label: t("kpi.human"), count: data.humanClicks ?? 0 },
            { label: labels.device("bot"), count: data.botClicks ?? 0 },
          ]}
        />
      );
    }
    case "chapter-who":
      return (
        <BreakdownList
          items={[
            { label: t("journal.newVisitors"), count: data.returnRate?.newVisitors ?? 0 },
            { label: t("journal.returningVisitors"), count: data.returnRate?.returningVisitors ?? 0 },
          ]}
        />
      );
    case "chapter-where":
      return <BreakdownList items={countryItems(data.countryClicks ?? [], labels)} total={data.humanClicks} maxItems={5} />;
    case "section-client-app":
      return <ClientAppBreakdown items={data.clientAppClicks ?? []} total={data.humanClicks} maxItems={5} />;
    case "section-channel-depth":
      // 충성도 문장의 근거는 클릭 순위가 아니라 채널별 재방문율이다 — 상세와 같은 표를 그대로.
      return (
        <ChannelDepthTable data={(data.channelDepth ?? []).slice(0, 5)} timezone={data.timezone} />
      );
    default:
      return null;
  }
}

/** 룰 엔진은 i18n 을 모르는 순수 함수다. 메시지 키·날짜·원값 번역은 렌더 직전 여기서만 한다. */
function resolveParams(entry: JournalEntry, locale: string, labels: StatsLabels) {
  const resolved = { ...entry.params };
  if (typeof resolved.country === "string") resolved.country = labels.country(resolved.country);
  const date = resolved.date;
  if (typeof date === "string" && /^\d{2}-\d{2}$/.test(date)) {
    const [month, day] = date.split("-").map(Number);
    resolved.date = new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", timeZone: "UTC" }).format(
      Date.UTC(2000, month - 1, day),
    );
  }
  return resolved;
}

export function StatsJournal({
  data,
  onNavigate,
  initialVisible = 2,
}: {
  data: LinkStats;
  onNavigate: (section: string) => void;
  initialVisible?: number;
}) {
  const t = useTranslations("stats.journal");
  const locale = useLocale();
  const labels = useStatsLabels();
  const entries = journalEntries(data);
  const [showAll, setShowAll] = useState(false);
  const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(new Set());
  // 접힘 애니메이션 동안 내용이 사라지지 않도록, 한 번 펼친 근거는 마운트를 유지한다.
  const [everOpened, setEverOpened] = useState<ReadonlySet<string>>(new Set());
  if (entries.length === 0) return null;

  function toggle(key: string) {
    setEverOpened((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <section>
      {/* 한글 라벨에 mono+tracking 을 주면 "링 크 일 지"처럼 벌어진다. */}
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {t("title")}
      </h2>
      <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
        {(showAll ? entries : entries.slice(0, initialVisible)).map((entry) => {
          const open = openKeys.has(entry.key);
          const panelId = `journal-evidence-${entry.key}`;
          return (
            <li key={entry.key}>
              <button
                type="button"
                onClick={() => toggle(entry.key)}
                aria-expanded={open}
                aria-controls={panelId}
                className="focus-ring group -mx-1 w-[calc(100%+0.5rem)] rounded-lg px-1 py-3.5 text-left transition-[background-color] duration-150 ease-out hover:bg-slate-50/70 active:bg-slate-100/70 dark:hover:bg-slate-800/40 dark:active:bg-slate-800/60"
              >
                <span className="flex items-start gap-3">
                  <span className="min-w-0 flex-1 text-[15px] font-medium leading-relaxed text-slate-800 dark:text-slate-200 sm:text-[16px]">
                    {t(entry.key, resolveParams(entry, locale, labels))}
                  </span>
                  <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-slate-500 transition-colors duration-150 ease-out group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-100">
                    {t("evidence")}
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "h-3 w-3 transition-transform duration-200 ease-[var(--ease)] motion-reduce:transition-none",
                        open && "rotate-180",
                      )}
                    />
                  </span>
                </span>
                {entry.spark && entry.spark.length > 1 && (
                  <span className="mt-1.5 block">
                    <Sparkline
                      values={entry.spark}
                      width={96}
                      height={20}
                      className="text-slate-400 dark:text-slate-500"
                    />
                  </span>
                )}
                {entry.ratio !== undefined && !entry.spark && (
                  <span aria-hidden className="mt-2 block">
                    <span className="block h-1.5 w-28 bg-slate-100 dark:bg-slate-900">
                      <span
                        className="block h-full bg-slate-300 dark:bg-slate-700"
                        style={{ width: `${Math.round(Math.min(1, entry.ratio) * 100)}%` }}
                      />
                    </span>
                  </span>
                )}
              </button>
              <div
                id={panelId}
                aria-hidden={!open}
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-[280ms] ease-[var(--ease)] motion-reduce:transition-none",
                  open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="mb-4 ml-[2px] max-w-2xl border-l-2 border-slate-100 py-1 pl-4 dark:border-slate-800">
                    {everOpened.has(entry.key) && (
                      <EvidenceBody entry={entry} data={data} />
                    )}
                    <button
                      type="button"
                      tabIndex={open ? 0 : -1}
                      onClick={() => onNavigate(entry.evidence)}
                      className="focus-ring mt-3 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-slate-500 transition-colors duration-150 ease-out hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      {t("detail")}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {entries.length > initialVisible && <button type="button" onClick={() => setShowAll((value) => !value)} aria-expanded={showAll} className="focus-ring -mx-2 min-h-11 rounded-lg px-2 text-sm font-medium text-slate-600 dark:text-slate-300">{showAll ? t("showLess") : t("showMore", { count: entries.length - initialVisible })}</button>}
    </section>
  );
}
