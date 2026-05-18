"use client";

import type { LinkStats } from "@/types";
import { StatsCards } from "@/components/stats-cards";
import { Header } from "./Header";
import { StatsEmptyState } from "./StatsEmptyState";
import { TabBar } from "./TabBar";
import { AudienceTab } from "./tabs/AudienceTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { SourcesTab } from "./tabs/SourcesTab";
import { TrafficTab } from "./tabs/TrafficTab";
import { useTabHash } from "../_lib/use-tab-hash";

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
