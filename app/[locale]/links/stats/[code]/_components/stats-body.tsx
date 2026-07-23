"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LinkStats } from "@/types";
import { OverviewBento } from "./overview-bento";
import { WhenChapter, type RangeDays } from "./chapters/when-chapter";
import { WhereChapter } from "./chapters/where-chapter";
import { WhoChapter } from "./chapters/who-chapter";
import { Header } from "./header";
import { StatsEmptyState } from "./stats-empty-state";
import { TabBar } from "./tab-bar";
import { SettingsTab } from "./tabs/settings-tab";
import { useTabHash, type TabKey } from "../_lib/use-tab-hash";

// 뎁스 2층 구조: 1층(개요) = 히어로 KPI + 링크 일지 + 챕터 카드 3장(엄선), 2층 = 챕터 상세.
// 근거/KPI 점프는 섹션이 사는 챕터로 내려간 뒤 그 섹션으로 스크롤한다 — 해시 기반이라
// 브라우저 뒤로가기가 그대로 "개요로 복귀"가 되는 예측 가능한 동작.
const SECTION_CHAPTER: Record<string, TabKey> = {
  "section-device": "who",
  "section-bots": "who",
  "section-live": "when",
  "section-heatmap": "when",
  "section-daily": "when",
  "section-hourly": "when",
  "section-sources": "where",
  "chapter-who": "who",
  "chapter-when": "when",
  "chapter-where": "where",
};

/**
 * Body of the stats page, lifted out of {@code page.tsx} so the public {@code /demo} route can
 * render the exact same surface against synthetic data without copy-pasting the layout.
 *
 * <p>The {@code demo} flag is the single switch the demo route flips on. The dashboard's stats
 * page passes {@code false} and gets the live behaviour — public-stats toggle, SSE live click
 * feed, A/B destinations + webhooks settings. The demo route passes {@code true} and gets the
 * same components rendered as static stand-ins instead of mounted-with-API-calls, so visitors
 * see the chrome of every section without the page trying to authenticate or open an EventSource.
 */
export function StatsBody({
  data,
  shortUrl,
  shortCodeLabel,
  onCopy,
  onTick,
  demo = false,
}: {
  data: LinkStats;
  shortUrl: string;
  shortCodeLabel: string;
  onCopy: () => void;
  onTick: () => void;
  demo?: boolean;
}) {
  const t = useTranslations("stats");
  const [view, setView] = useTabHash();
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  // 기간 프리셋은 클라이언트 절환 — API 는 최근 30일치 일별 시계열을 주므로 그 안에서 자른다.
  const slicedDaily = useMemo(
    () => (data.dailyClicks ?? []).slice(-rangeDays),
    [data.dailyClicks, rangeDays],
  );

  useEffect(() => {
    if (!pendingScroll) return;
    // 챕터 뷰가 렌더된 다음 페인트에 목적지 섹션이 생긴다 — rAF 로 한 박자 늦춰 스크롤.
    const id = pendingScroll;
    const raf = requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

  function backToOverview() {
    setView("overview");
    setPendingScroll(null);
    window.scrollTo({ top: 0 });
  }

  return (
    <>
      <Header
        data={data}
        shortUrl={shortUrl}
        shortCodeLabel={shortCodeLabel}
        onCopy={onCopy}
        demo={demo}
      />
      {view === "overview" || view === "settings" ? (
        <>
          {data.totalClicks === 0 && (
            <StatsEmptyState shortUrl={shortUrl || `/${data.shortCode}`} />
          )}
          <TabBar
            active={view === "settings" ? "settings" : "overview"}
            onSelect={(k) => setView(k === "settings" ? "settings" : "overview")}
            items={["overview", "settings"]}
          />
          {view === "overview" ? (
            <OverviewBento
              data={data}
              slicedDaily={slicedDaily}
              range={rangeDays}
              onRange={setRangeDays}
              onNavigate={handleNavigate}
              onTick={onTick}
              demo={demo}
            />
          ) : (
            <SettingsTab data={data} onTick={onTick} demo={demo} />
          )}
        </>
      ) : (
        <div className="space-y-5">
          {/* 2층 챕터 상세 — 돌아가는 길은 항상 같은 자리(좌상단), 브라우저 뒤로가기도 동작 */}
          <button
            type="button"
            onClick={backToOverview}
            className="focus-ring inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t("tabs.overview")}
          </button>
          {view === "who" && <WhoChapter data={data} />}
          {view === "when" && (
            <WhenChapter
              data={data}
              dailyClicks={slicedDaily}
              range={rangeDays}
              onRange={setRangeDays}
              onTick={onTick}
              demo={demo}
            />
          )}
          {view === "where" && <WhereChapter data={data} />}
        </div>
      )}
    </>
  );
}
