"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Heatmap } from "@/components/links/stats/charts/heatmap";
import { LiveClickFeed } from "@/components/links/stats/live-click-feed";
import { LiveClickFeedDemo } from "@/components/links/stats/live-click-feed-demo";
import { Reveal } from "@/components/common/reveal";
import { Section } from "@/components/common/section";
import type { LinkStats } from "@/types";
import { ChapterHeading } from "./chapter-heading";

// recharts(~90KB gz)는 이 두 차트만 쓴다 — 뷰포트에 실제로 들어올 때만 청크를 받도록 동적 로드,
// 자리표시자로 하이드레이션 레이아웃 점프 방지(구 트래픽 탭 문법 그대로).
function ChartSkeleton({ className = "h-64" }: { className?: string }) {
  return (
    <div
      className={`w-full animate-pulse rounded-lg bg-slate-100/70 dark:bg-slate-800/40 ${className}`}
      aria-hidden
    />
  );
}

const DailyChart = dynamic(
  () => import("@/components/links/stats/charts/daily-chart").then((m) => m.DailyChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
const HourChart = dynamic(
  () => import("@/components/links/stats/charts/hour-chart").then((m) => m.HourChart),
  { ssr: false, loading: () => <ChartSkeleton className="h-72" /> },
);

/** 2장 언제 — 라이브 피드, 히트맵, 일별 추이(기간 프리셋 적용), 시간대. (구 개요 라이브/히트맵 + 트래픽) */
export function WhenChapter({
  data,
  dailyClicks,
  onTick,
  demo = false,
}: {
  data: LinkStats;
  /** JumpBar 기간 프리셋이 자른 일별 시계열 */
  dailyClicks?: LinkStats["dailyClicks"];
  onTick: () => void;
  demo?: boolean;
}) {
  const t = useTranslations("stats");
  return (
    <div id="chapter-when" className="scroll-mt-28 space-y-4">
      <ChapterHeading index={2} title={t("chapters.when")} />
      <div id="section-live">
        {demo ? (
          <LiveClickFeedDemo />
        ) : (
          <LiveClickFeed shortCode={data.shortCode} onTick={onTick} />
        )}
      </div>
      <Reveal>
        <Section
          id="section-heatmap"
          title={t("section.heatmap.title")}
          description={t("section.heatmap.desc", { tz: data.timezone })}
        >
          <Heatmap data={data.heatmap} />
        </Section>
      </Reveal>
      <Reveal delay={60}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Section
            id="section-daily"
            title={t("section.daily.title")}
            description={t("section.daily.desc", { tz: data.timezone })}
            className="lg:col-span-2"
          >
            <DailyChart data={dailyClicks ?? data.dailyClicks} />
          </Section>
          <Section
            id="section-hourly"
            title={t("section.hourly.title")}
            description={t("section.hourly.desc")}
          >
            <HourChart data={data.hourClicks} />
          </Section>
        </div>
      </Reveal>
    </div>
  );
}
