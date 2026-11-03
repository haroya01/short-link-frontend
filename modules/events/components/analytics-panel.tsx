"use client";

import { useTranslations } from "next-intl";
import { BreakdownRows } from "@/components/links/stats/breakdown-rows";
import { KpiLine } from "@/components/links/stats/kpi-line";
import type { EventAnalytics } from "@/modules/events/api/events";
import { cn, formatNumber } from "@/lib/utils";

export function AnalyticsPanel({ analytics, className }: { analytics: EventAnalytics; className?: string }) {
  const t = useTranslations("events.analytics");
  const conversion =
    analytics.totalClicks > 0 ? `${Math.round((analytics.totalRegistrations / analytics.totalClicks) * 100)}%` : "—";

  return (
    <section className={cn("border-t border-slate-200 pt-6 dark:border-slate-800", className)}>
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h2>

      <KpiLine
        className="mt-4"
        hero={{ label: t("totalRegistrations"), value: formatNumber(analytics.totalRegistrations) }}
        metrics={[
          { label: t("totalClicks"), value: formatNumber(analytics.totalClicks) },
          { label: t("conversion"), value: conversion, muted: analytics.totalClicks === 0 },
        ]}
      />

      <Breakdown
        title={t("registrationsByChannel")}
        buckets={analytics.registrationsByChannel}
        emptyLabel={t("noRegistrations")}
      />
      <Breakdown title={t("clicksByLink")} buckets={analytics.clicksByLink} emptyLabel={t("noClicks")} />
      <Breakdown title={t("clicksByClientApp")} buckets={analytics.clicksByClientApp} emptyLabel={t("noClicks")} />
    </section>
  );
}

function Breakdown({
  title,
  buckets,
  emptyLabel,
}: {
  title: string;
  buckets: { key: string; count: number }[];
  emptyLabel: string;
}) {
  return (
    <div className="mt-6">
      <h3 className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{title}</h3>
      <div className="mt-2.5">
        {buckets.length === 0 ? (
          <p className="text-[13px] text-slate-500 dark:text-slate-400">{emptyLabel}</p>
        ) : (
          <BreakdownRows items={buckets.map((bucket) => ({ label: bucket.key, count: bucket.count }))} maxItems={8} />
        )}
      </div>
    </div>
  );
}
