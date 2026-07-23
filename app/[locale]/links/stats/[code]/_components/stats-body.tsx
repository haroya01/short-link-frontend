"use client";

import { useEffect, useMemo, useState } from "react";
import type { LinkStats } from "@/types";
import { JumpBar, type RangeDays } from "./jump-bar";
import { StatsCards } from "@/components/links/stats/cards";
import { InsightSummary } from "@/components/links/stats/insight-summary";
import { Header } from "./header";
import { StatsEmptyState } from "./stats-empty-state";
import { TabBar } from "./tab-bar";
import { AudienceTab } from "./tabs/audience-tab";
import { OverviewTab } from "./tabs/overview-tab";
import { SettingsTab } from "./tabs/settings-tab";
import { SourcesTab } from "./tabs/sources-tab";
import { TrafficTab } from "./tabs/traffic-tab";
import { useTabHash } from "../_lib/use-tab-hash";

// 분석은 이제 단일 스크롤 허브 — 콘텐츠 섹션은 전부 같은 뷰에 있으므로 KPI 점프는 순수
// 스크롤이다. 탭 전환이 필요한 건 설정뿐(5탭 시절의 SECTION_TAB 매핑은 그래서 죽었다).

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
  const [tab, setTab] = useTabHash();
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  // 기간 프리셋은 클라이언트 절환 — API 는 최근 30일치 일별 시계열을 주므로 그 안에서 자른다.
  const slicedDaily = useMemo(
    () => (data.dailyClicks ?? []).slice(-rangeDays),
    [data.dailyClicks, rangeDays],
  );

  useEffect(() => {
    if (!pendingScroll) return;
    // The target section only enters the DOM after the tab switch re-renders. requestAnimationFrame
    // pushes the scroll to the next paint so the element exists when we look it up.
    const id = pendingScroll;
    const raf = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingScroll(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [pendingScroll, tab]);

  function handleNavigate(section: string) {
    // 콘텐츠 섹션은 전부 분석 허브에 있다 — 설정 뷰에서 눌렀을 때만 허브로 복귀 후 스크롤.
    if (tab === "settings") {
      setTab("overview");
    }
    setPendingScroll(section);
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
      {data.totalClicks === 0 && <StatsEmptyState shortUrl={shortUrl || `/${data.shortCode}`} />}
      <StatsCards
        total={data.totalClicks}
        human={data.humanClicks}
        bot={data.botClicks}
        unique={data.uniqueClicks}
        profileClicks={data.profileClicks}
        timeToFirstClickMinutes={data.timeToFirstClickMinutes}
        velocityRatio={data.velocity?.ratio ?? 0}
        dailySeries={slicedDaily.map((d) => d.count)}
        animate={!demo}
        onNavigate={handleNavigate}
      />
      <InsightSummary data={data} />
      <TabBar
        active={tab === "settings" ? "settings" : "overview"}
        onSelect={(k) => setTab(k === "settings" ? "settings" : "overview")}
        items={["overview", "settings"]}
      />
      {tab !== "settings" ? (
        <div className="space-y-5">
          <JumpBar range={rangeDays} onRange={setRangeDays} />
          <OverviewTab data={data} onTick={onTick} demo={demo} />
          <TrafficTab data={data} dailyClicks={slicedDaily} />
          <SourcesTab data={data} />
          <AudienceTab data={data} />
        </div>
      ) : (
        <SettingsTab data={data} onTick={onTick} demo={demo} />
      )}
    </>
  );
}
