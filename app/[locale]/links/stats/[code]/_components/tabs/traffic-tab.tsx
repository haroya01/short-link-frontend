"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { CountryTable } from "@/components/links/stats/country-table";
import { Reveal } from "@/components/common/reveal";
import { Section } from "@/components/common/section";
import type { LinkStats } from "@/types";

// 두 차트만 recharts(~90KB gz)를 끌어온다 — 기본 탭은 overview(recharts 미사용)라, 이 무게가 stats
// 라우트 첫 로드에 실리지 않게 트래픽 탭이 실제로 열릴 때만 청크를 받는다. 로딩 중엔 차트 높이만큼의
// 자리표시자를 두어 하이드레이션 시 레이아웃이 튀지 않게 한다(블로그 분석 차트와 같은 문법).
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

export function TrafficTab({ data }: { data: LinkStats }) {
  const t = useTranslations("stats");
  return (
    <div className="space-y-5">
      <Reveal>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Section
            id="section-daily"
            title={t("section.daily.title")}
            description={t("section.daily.desc", { tz: data.timezone })}
            className="lg:col-span-2"
          >
            <DailyChart data={data.dailyClicks} />
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
      <Reveal delay={60}>
        <Section title={t("section.country.title")} description={t("section.country.desc")}>
          <CountryTable data={data.countryClicks} />
        </Section>
      </Reveal>
    </div>
  );
}
