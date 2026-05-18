"use client";

import { useTranslations } from "next-intl";
import { Heatmap } from "@/components/charts/heatmap";
import { ClickQualitySummary } from "@/components/click-quality-summary";
import { LiveClickFeed } from "@/components/live-click-feed";
import { LiveClickFeedDemo } from "@/components/live-click-feed-demo";
import { Reveal } from "@/components/reveal";
import { Section } from "@/components/section";
import type { LinkStats } from "@/types";

export function OverviewTab({
  data,
  onTick,
  demo = false,
}: {
  data: LinkStats;
  onTick: () => void;
  /**
   * The dashboard's stats page mounts a real SSE {@link LiveClickFeed} that authenticates
   * against {@code /api/v1/links/{code}/stream}. On the public /demo route there's no session,
   * so we swap in {@link LiveClickFeedDemo} — same chrome, scripted rows that pop in on a
   * loop. The rest of the tab (quality summary, heatmap) reads from the synthetic data the
   * same way it reads from real LinkStats.
   */
  demo?: boolean;
}) {
  const t = useTranslations("stats");
  return (
    <div className="space-y-5">
      <ClickQualitySummary data={data} />
      {demo ? (
        <LiveClickFeedDemo />
      ) : (
        <LiveClickFeed shortCode={data.shortCode} onTick={onTick} />
      )}
      <Reveal>
        <Section
          title={t("section.heatmap.title")}
          description={t("section.heatmap.desc", { tz: data.timezone })}
        >
          <Heatmap data={data.heatmap} />
        </Section>
      </Reveal>
    </div>
  );
}
