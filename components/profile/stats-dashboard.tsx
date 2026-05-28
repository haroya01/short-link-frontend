"use client";

import { useTranslations } from "next-intl";
import type { ProfileStats } from "@/types";
import { StatsCards } from "@/components/stats/cards";
import { DailyChart } from "@/components/stats/charts/daily-chart";
import { Heatmap } from "@/components/stats/charts/heatmap";
import { CountryTable } from "@/components/stats/country-table";
import { BreakdownList } from "@/components/stats/breakdown-list";
import { Section } from "@/components/common/section";

/**
 * Renders a {@link ProfileStats} payload as the full chart dashboard. Same component used by
 * both owner ({@code /content/readers}) and public ({@code /u/<username>/stats}) pages — the only
 * difference between those two views is the data source + header chrome, the visual breakdown
 * is identical. Extracted to keep the two call sites from drifting (and so the public page
 * doesn't accidentally leak owner-only widgets we add later).
 */
export function ProfileStatsDashboard({ data }: { data: ProfileStats }) {
  const t = useTranslations("settings.profile.stats");
  const tBreak = useTranslations("stats.breakdown");

  return (
    <div className="space-y-6">
      <StatsCards
        total={data.totalVisits}
        human={data.humanVisits}
        bot={data.botVisits}
        unique={data.uniqueVisits}
      />

      <Section title={t("daily.title")} description={t("daily.desc")}>
        <DailyChart data={data.dailyVisits} />
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title={t("heatmap.title")} description={t("heatmap.desc")}>
          <Heatmap data={data.heatmap} />
        </Section>
        <Section title={t("countries.title")} description={t("countries.desc")}>
          <CountryTable data={data.countryVisits} />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title={t("devices.title")} description={t("devices.desc")}>
          <BreakdownList
            items={data.deviceVisits.map((d) => ({
              label: d.device || tBreak("unknown"),
              count: d.count,
            }))}
          />
        </Section>
        <Section title={t("browsers.title")} description={t("browsers.desc")}>
          <BreakdownList
            items={data.browserVisits.map((b) => ({
              label: b.browser || tBreak("unknown"),
              count: b.count,
            }))}
          />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title={t("referrers.title")} description={t("referrers.desc")}>
          <BreakdownList
            items={data.referrerHostVisits.map((r) => ({
              label: r.host || tBreak("direct"),
              count: r.count,
            }))}
          />
        </Section>
        <Section title={t("channels.title")} description={t("channels.desc")}>
          <BreakdownList
            items={data.sourceChannelVisits.map((s) => ({
              label: s.source || tBreak("unknown"),
              count: s.count,
            }))}
          />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title={t("utmCampaigns.title")} description={t("utmCampaigns.desc")}>
          <BreakdownList
            items={data.utmCampaignVisits.map((u) => ({ label: u.campaign, count: u.count }))}
          />
        </Section>
        <Section title={t("utmSources.title")} description={t("utmSources.desc")}>
          <BreakdownList
            items={data.utmSourceVisits.map((u) => ({ label: u.source, count: u.count }))}
          />
        </Section>
      </div>
    </div>
  );
}
