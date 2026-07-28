"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import { ChannelDepthTable } from "@/components/links/stats/channel-depth-table";
import { DeviceChart } from "@/components/links/stats/charts/device-chart";
import { ClientAppBreakdown } from "@/components/links/stats/labeled-breakdowns";
import { Sparkline } from "@/components/links/stats/sparkline";
import { buildJournal, type JournalEntry } from "@/lib/stats-journal";
import { cn } from "@/lib/utils";
import type { LinkStats } from "@/types";

// recharts 차트는 문장이 처음 펼쳐질 때만 청크를 받는다 — 개요 초기 로드에 90KB 를 얹지 않는다.
const DailyChart = dynamic(
  () => import("@/components/links/stats/charts/daily-chart").then((m) => m.DailyChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-52 w-full animate-pulse rounded-lg bg-slate-100/70 dark:bg-slate-800/40" aria-hidden />
    ),
  },
);
const HourChart = dynamic(
  () => import("@/components/links/stats/charts/hour-chart").then((m) => m.HourChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-52 w-full animate-pulse rounded-lg bg-slate-100/70 dark:bg-slate-800/40" aria-hidden />
    ),
  },
);

/**
 * 근거 앵커 → 인라인 근거 매핑. 문장을 쓴 룰(lib/stats-journal)이 가리키는 앵커의 차트/수치를
 * 문장 바로 아래에 그대로 그린다 — 상세 섹션과 같은 컴포넌트라 "문장 따로 근거 따로"가 없다.
 * 챕터 전체가 근거인 문장(재방문·국가)은 그 문장이 말하는 분해만 추려 보여준다.
 */
function EvidenceBody({ evidence, data }: { evidence: string; data: LinkStats }) {
  const t = useTranslations("stats");
  switch (evidence) {
    case "section-daily":
      return <DailyChart data={data.dailyClicks ?? []} compact />;
    case "section-hourly":
      return <HourChart data={data.hourClicks ?? []} compact />;
    case "section-sources":
      return (
        <BreakdownList
          items={(data.referrerHostClicks ?? [])
            .slice(0, 5)
            .map((r) => ({ label: r.host, count: r.count }))}
        />
      );
    case "section-device":
      return <DeviceChart data={data.deviceClicks ?? []} />;
    case "section-bots": {
      const bots = data.botClicks2 ?? [];
      if (bots.length > 0) {
        return (
          <BreakdownList items={bots.slice(0, 5).map((b) => ({ label: b.bot, count: b.count }))} />
        );
      }
      // 봇 분류가 없으면 사람/봇 비중 자체가 근거다.
      return (
        <BreakdownList
          items={[
            { label: t("kpi.human"), count: data.humanClicks ?? 0 },
            { label: t("kpi.bot"), count: data.botClicks ?? 0 },
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
      return (
        <BreakdownList
          items={(data.countryClicks ?? [])
            .slice(0, 5)
            .map((c) => ({ label: c.country, count: c.count }))}
        />
      );
    case "section-client-app":
      return <ClientAppBreakdown items={(data.clientAppClicks ?? []).slice(0, 5)} />;
    case "section-channel-depth":
      // 충성도 문장의 근거는 클릭 순위가 아니라 채널별 재방문율이다 — 상세와 같은 표를 그대로.
      return (
        <ChannelDepthTable data={(data.channelDepth ?? []).slice(0, 5)} timezone={data.timezone} />
      );
    default:
      return null;
  }
}

/**
 * 룰이 넘긴 파라미터 중 값 자체가 메시지 키인 것(예: 인앱 앱 이름)을 카탈로그로 한 번 옮긴다.
 * 룰 엔진은 i18n 을 모르는 순수 함수로 두고, 번역은 렌더 직전 이 한 줄에서만 일어난다.
 */
function resolveParams(entry: JournalEntry, tStats: ReturnType<typeof useTranslations>) {
  if (!entry.translatedParams?.length) return entry.params;
  const resolved = { ...entry.params };
  for (const name of entry.translatedParams) {
    resolved[name] = tStats(String(entry.params[name]));
  }
  return resolved;
}

/**
 * 링크 일지 — "읽는 통계"의 1면. 문장이 1급 시민이고 차트는 증거다: 각 문장은 실데이터
 * 룰(lib/stats-journal)이 썼고, 누르면 그 자리에서 근거가 펼쳐진다(shorten 폼 고급 옵션과
 * 같은 grid-rows 접이). 여러 문장을 동시에 펼쳐 나란히 읽을 수 있고, 펼침 안의 "상세 보기"가
 * 그 데이터가 사는 챕터(2층)로 내려간다. 카드 상자 없이 헤어라인 행 — 종이 문법(§10).
 */
export function StatsJournal({
  data,
  onNavigate,
}: {
  data: LinkStats;
  onNavigate: (section: string) => void;
}) {
  const t = useTranslations("stats.journal");
  const tStats = useTranslations("stats");
  const entries = buildJournal(data);
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
      {/* 한글 라벨엔 mono+tracking 이 자간을 벌려 "링 크 일 지"처럼 읽힌다(§10.3 계보) — 자간 없이. */}
      <h2 className="text-[11px] font-semibold text-accent-700 dark:text-accent-400">
        {t("title")}
      </h2>
      <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
        {entries.map((entry) => {
          const open = openKeys.has(entry.key);
          const panelId = `journal-evidence-${entry.key}`;
          return (
            <li key={entry.key}>
              <button
                type="button"
                onClick={() => toggle(entry.key)}
                aria-expanded={open}
                aria-controls={panelId}
                className="focus-ring group w-full rounded-lg px-1 py-3.5 text-left transition-[background-color] duration-150 ease-out hover:bg-slate-50/70 active:bg-slate-100/70 dark:hover:bg-slate-800/40 dark:active:bg-slate-800/60"
              >
                <span className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-[9px] inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600 dark:bg-accent-400"
                  />
                  <span className="min-w-0 flex-1 text-[15px] font-medium leading-relaxed text-slate-800 dark:text-slate-200 sm:text-[16px]">
                    {t(entry.key, resolveParams(entry, tStats))}
                  </span>
                  <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-slate-400 transition-colors duration-150 ease-out group-hover:text-accent-700 dark:text-slate-500 dark:group-hover:text-accent-400">
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
                {/* 미니 드로잉은 문장 아래 자기 줄 — 접힌 상태에서도 리스트가 살아 있게. */}
                {entry.spark && entry.spark.length > 1 && (
                  <span className="mt-1.5 block pl-[18px]">
                    <Sparkline
                      values={entry.spark}
                      width={96}
                      height={20}
                      className="text-accent-600 dark:text-accent-400"
                    />
                  </span>
                )}
                {entry.ratio !== undefined && !entry.spark && (
                  <span aria-hidden className="mt-2 block pl-[18px]">
                    <span className="block h-1.5 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <span
                        className="block h-full rounded-full bg-accent-600 dark:bg-accent-400"
                        style={{ width: `${Math.round(Math.min(1, entry.ratio) * 100)}%` }}
                      />
                    </span>
                  </span>
                )}
              </button>
              {/* 그 자리 근거 — grid-rows 0fr↔1fr 접이(shorten 폼 고급 옵션 문법). */}
              <div
                id={panelId}
                aria-hidden={!open}
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-[280ms] ease-[var(--ease)] motion-reduce:transition-none",
                  open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  {/* 근거는 본문 컬럼 폭(2xl)으로 — 행은 전폭이어도 차트가 화면만큼 늘어지지 않게. */}
                  <div className="mb-4 ml-[2px] max-w-2xl border-l-2 border-slate-100 py-1 pl-4 dark:border-slate-800">
                    {everOpened.has(entry.key) && (
                      <EvidenceBody evidence={entry.evidence} data={data} />
                    )}
                    <button
                      type="button"
                      tabIndex={open ? 0 : -1}
                      onClick={() => onNavigate(entry.evidence)}
                      className="focus-ring mt-3 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] font-medium text-slate-500 transition-colors duration-150 ease-out hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400"
                    >
                      {t("detail")}
                      <ArrowUpRight aria-hidden className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
