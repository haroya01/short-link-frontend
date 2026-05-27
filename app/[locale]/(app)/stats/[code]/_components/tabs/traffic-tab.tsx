"use client";

import { useTranslations } from "next-intl";
import { CountryTable } from "@/components/stats/country-table";
import { DailyChart } from "@/components/stats/charts/daily-chart";
import { HourChart } from "@/components/stats/charts/hour-chart";
import { Reveal } from "@/components/common/reveal";
import { Section } from "@/components/common/section";
import type { LinkStats } from "@/types";

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
