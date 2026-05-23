"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ApiError, getPublicLinkStats } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { StatsCards } from "@/components/stats/cards";
import { Section } from "@/components/common/section";
import { Heatmap } from "@/components/stats/charts/heatmap";
import { DailyChart } from "@/components/stats/charts/daily-chart";
import { DeviceChart } from "@/components/stats/charts/device-chart";
import { BreakdownList } from "@/components/stats/breakdown-list";
import { CountryTable } from "@/components/stats/country-table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import type { LinkStats } from "@/types";

export default function PublicStatsPage() {
  const params = useParams<{ code: string }>();
  const t = useTranslations("stats");
  const tPublic = useTranslations("publicStats");
  const code = params.code;
  const [data, setData] = useState<LinkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPublicLinkStats(code)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setData(null);
            setError(null);
          } else {
            setError(err instanceof Error ? err.message : "load failed");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (loading) {
    return (
      <div className="container max-w-6xl space-y-5 py-10">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-2xl py-10">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container max-w-md py-20">
        <EmptyState
          title={t("notFound")}
          description={t("notFoundDesc")}
          action={
            <Link href="/">
              <Button variant="outline">{t("backToDashboard")}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl space-y-5 py-10">
      <header className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700">
            {tPublic("title")}
          </p>
          <h1 className="mt-1.5 font-mono text-xl font-bold tracking-tight text-slate-900">
            /{data.shortCode}
          </h1>
        </div>
        <span className="rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-medium text-accent-700 ring-1 ring-inset ring-accent-200">
          {tPublic("publicBadge")}
        </span>
      </header>

      <StatsCards
        total={data.totalClicks}
        human={data.humanClicks}
        bot={data.botClicks}
        unique={data.uniqueClicks}
        timeToFirstClickMinutes={data.timeToFirstClickMinutes}
        velocityRatio={data.velocity?.ratio ?? 0}
      />

      <Section
        title={t("section.heatmap.title")}
        description={t("section.heatmap.desc", { tz: data.timezone })}
      >
        <Heatmap data={data.heatmap} />
      </Section>

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
          id="section-device"
          title={t("section.device.title")}
          description={t("section.device.desc")}
        >
          <DeviceChart data={data.deviceClicks} />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title={t("section.channel.title")} description={t("section.channel.desc")}>
          <BreakdownList
            items={data.channelClicks.map((c) => ({ label: c.channel, count: c.count }))}
          />
        </Section>
        <Section title={t("section.country.title")} description={t("section.country.desc")}>
          <CountryTable data={data.countryClicks} />
        </Section>
      </div>
    </div>
  );
}
