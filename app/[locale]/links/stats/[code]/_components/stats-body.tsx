"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { LinkStats } from "@/types";
import { fillDailyClicks } from "@/lib/stats-daily";
import { StatsOverview } from "./overview";
import { WhenChapter, type RangeDays } from "./chapters/when-chapter";
import { WhereChapter } from "./chapters/where-chapter";
import { WhoChapter } from "./chapters/who-chapter";
import { Header } from "./header";
import { StatsEmptyState } from "./stats-empty-state";
import { TabBar } from "./tab-bar";
import { SettingsTab } from "./tabs/settings-tab";
import { useTabHash, type TabKey } from "../_lib/use-tab-hash";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";

const SECTION_CHAPTER: Record<string, TabKey> = {
  "section-device": "who",
  "section-bots": "who",
  "section-client-app": "who",
  "section-live": "when",
  "section-heatmap": "when",
  "section-daily": "when",
  "section-hourly": "when",
  "section-sources": "where",
  "section-channel-depth": "where",
  "section-fetch-site": "where",
  "section-post-clicks": "where",
  "chapter-who": "who",
  "chapter-when": "when",
  "chapter-where": "where",
};

/** `demo` renders every section as a static stand-in: no auth, no API calls, no EventSource. */
export function StatsBody({
  data: sourceData,
  shortUrl,
  shortCodeLabel,
  onTick,
  demo = false,
}: {
  data: LinkStats;
  shortUrl: string;
  shortCodeLabel: string;
  onTick: () => void;
  demo?: boolean;
}) {
  const t = useTranslations("stats");
  const data = useMemo(() => {
    // Synthetic reports use a fixed snapshot date; live reports always end on today's report day.
    const snapshot = demo || process.env.NEXT_PUBLIC_USE_MOCKS === "1";
    const lastDate = sourceData.dailyClicks?.at(-1)?.date;
    return {
      ...sourceData,
      dailyClicks: fillDailyClicks(sourceData.dailyClicks ?? [], {
        timezone: sourceData.timezone,
        now: snapshot && lastDate ? new Date(`${lastDate}T12:00:00Z`) : new Date(),
      }),
    };
  }, [sourceData, demo]);
  const [view, setView] = useTabHash();
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  // Missing days are filled above so seven rows mean seven calendar days, including idle days.
  const slicedDaily = useMemo(
    () => (data.dailyClicks ?? []).slice(-rangeDays),
    [data.dailyClicks, rangeDays],
  );

  useEffect(() => {
    if (!pendingScroll) return;
    // 챕터 뷰가 렌더된 다음 페인트에 목적지 섹션이 생긴다 — rAF 로 한 박자 늦춰 스크롤.
    const id = pendingScroll;
    const raf = requestAnimationFrame(() => {
      const reduce = prefersReducedMotion();
      document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      setPendingScroll(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [pendingScroll, view]);

  function handleNavigate(section: string) {
    const target = SECTION_CHAPTER[section] ?? "when";
    if (target !== view) setView(target);
    setPendingScroll(section);
  }

  return (
    <>
      <Header
        data={data}
        shortUrl={shortUrl}
        shortCodeLabel={shortCodeLabel}
        demo={demo}
        onSettings={() => setView("settings")}
        settingsActive={view === "settings"}
      />
      {data.totalClicks === 0 && view !== "settings" && (
        <StatsEmptyState />
      )}
      <TabBar active={view} onSelect={setView} items={["overview", "when", "where", "who"]} />
      {view !== "settings" && (
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t("scope.report", { tz: data.timezone })}</p>
      )}
      <div key={view} role="tabpanel" aria-label={view === "settings" ? t("linkSettings") : undefined} id={`stats-panel-${view}`} aria-labelledby={view === "settings" ? undefined : `stats-tab-${view}`} className="view-enter">
        {view === "overview" && <StatsOverview data={data} slicedDaily={slicedDaily} range={rangeDays} onRange={setRangeDays} onNavigate={handleNavigate} onTick={onTick} demo={demo} />}
        {view === "who" && <WhoChapter data={data} />}
        {view === "when" && <WhenChapter data={data} dailyClicks={slicedDaily} range={rangeDays} onRange={setRangeDays} onTick={onTick} demo={demo} />}
        {view === "where" && <WhereChapter data={data} />}
        {view === "settings" && <SettingsTab data={data} onTick={onTick} demo={demo} />}
      </div>
    </>
  );
}
