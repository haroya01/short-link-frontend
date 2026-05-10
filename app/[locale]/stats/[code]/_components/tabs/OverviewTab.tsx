"use client";

import { useTranslations } from "next-intl";
import { Heatmap } from "@/components/charts/heatmap";
import { ClickQualitySummary } from "@/components/click-quality-summary";
import { LiveClickFeed } from "@/components/live-click-feed";
import { Reveal } from "@/components/reveal";
import { Section } from "@/components/section";
import type { LinkStats } from "@/types";

export function OverviewTab({ data, onTick }: { data: LinkStats; onTick: () => void }) {
  const t = useTranslations("stats");
  return (
    <div className="space-y-5">
      <ClickQualitySummary data={data} />
      <LiveClickFeed shortCode={data.shortCode} onTick={onTick} />
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
