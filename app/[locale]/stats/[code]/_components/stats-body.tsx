"use client";

import { useEffect, useState } from "react";
import type { LinkStats } from "@/types";
import { StatsCards } from "@/components/stats/cards";
import { Header } from "./header";
import { StatsEmptyState } from "./stats-empty-state";
import { TabBar } from "./tab-bar";
import { AudienceTab } from "./tabs/audience-tab";
import { OverviewTab } from "./tabs/overview-tab";
import { SettingsTab } from "./tabs/settings-tab";
import { SourcesTab } from "./tabs/sources-tab";
import { TrafficTab } from "./tabs/traffic-tab";
import { useTabHash, type TabKey } from "../_lib/use-tab-hash";

// Each KPI card jumps to a section that lives inside a specific tab. Tab content is
// conditionally rendered (StatsBody only mounts the active tab), so clicking a card has to
// switch tabs first and then scroll once the section is in the DOM.
const SECTION_TAB: Record<string, TabKey> = {
  "section-daily": "traffic",
  "section-hourly": "traffic",
  "section-device": "audience",
  "section-bots": "audience",
  "section-sources": "sources",
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
  const [tab, setTab] = useTabHash();
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);

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
    const targetTab = SECTION_TAB[section];
    if (targetTab && targetTab !== tab) {
      setTab(targetTab);
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
        onNavigate={handleNavigate}
      />
      <TabBar active={tab} onSelect={setTab} />
      {tab === "overview" && <OverviewTab data={data} onTick={onTick} demo={demo} />}
      {tab === "traffic" && <TrafficTab data={data} />}
      {tab === "sources" && <SourcesTab data={data} />}
      {tab === "audience" && <AudienceTab data={data} />}
      {tab === "settings" && <SettingsTab data={data} onTick={onTick} demo={demo} />}
    </>
  );
}
