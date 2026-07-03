"use client";

import { useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import { DailyChart } from "@/components/links/stats/charts/daily-chart";
import { DeviceChart } from "@/components/links/stats/charts/device-chart";
import { HourChart } from "@/components/links/stats/charts/hour-chart";
import { ReferrerChart } from "@/components/links/stats/charts/referrer-chart";
import { Section } from "@/components/common/section";
import type { LinkStats } from "@/types";

/**
 * Same traffic / sources / audience charts the owner stats page renders, arranged for the admin
 * read-only view. The chart components own their own empty states; only the country breakdown is
 * assembled here, so it guards an empty array before handing off to {@link BreakdownList}.
 */
export function DetailStats({ stats }: { stats: LinkStats }) {
  const t = useTranslations("admin");
  const countryItems = stats.countryClicks.map((c) => ({ label: c.country, count: c.count }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Section
          title={t("detail.section.daily.title")}
          description={t("detail.section.daily.desc", { tz: stats.timezone })}
          className="lg:col-span-2"
        >
          <DailyChart data={stats.dailyClicks} />
        </Section>
        <Section
          title={t("detail.section.hourly.title")}
          description={t("detail.section.hourly.desc")}
        >
          <HourChart data={stats.hourClicks} />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section
          title={t("detail.section.referrers.title")}
          description={t("detail.section.referrers.desc")}
        >
          <ReferrerChart data={stats.referrerClicks} />
        </Section>
        <Section
          title={t("detail.section.devices.title")}
          description={t("detail.section.devices.desc")}
        >
          <DeviceChart data={stats.deviceClicks} />
        </Section>
      </div>

      <Section
        title={t("detail.section.countries.title")}
        description={t("detail.section.countries.desc")}
      >
        {countryItems.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            {t("detail.empty.countries")}
          </p>
        ) : (
          <BreakdownList items={countryItems} />
        )}
      </Section>
    </div>
  );
}
