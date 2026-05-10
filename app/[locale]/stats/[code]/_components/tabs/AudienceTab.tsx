"use client";

import { useTranslations } from "next-intl";
import { BreakdownList } from "@/components/breakdown-list";
import { DeviceChart } from "@/components/charts/device-chart";
import { Section } from "@/components/section";
import type { LinkStats } from "@/types";

export function AudienceTab({ data }: { data: LinkStats }) {
  const t = useTranslations("stats");
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Section
          id="section-device"
          title={t("section.device.title")}
          description={t("section.device.desc")}
        >
          <DeviceChart data={data.deviceClicks} />
        </Section>
        <Section title={t("section.os.title")} description={t("section.os.desc")}>
          <BreakdownList items={data.osClicks.map((o) => ({ label: o.os, count: o.count }))} />
        </Section>
        <Section title={t("section.browser.title")} description={t("section.browser.desc")}>
          <BreakdownList
            items={data.browserClicks.map((b) => ({ label: b.browser, count: b.count }))}
          />
        </Section>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t("section.region.title")} description={t("section.region.desc")}>
          <BreakdownList
            items={data.regionClicks.map((r) => ({ label: r.region, count: r.count }))}
          />
        </Section>
        <Section title={t("section.city.title")} description={t("section.city.desc")}>
          <BreakdownList
            items={data.cityClicks.map((c) => ({ label: c.city, count: c.count }))}
          />
        </Section>
      </div>
      <Section title={t("section.language.title")} description={t("section.language.desc")}>
        <BreakdownList
          items={data.languageClicks.map((l) => ({ label: l.language, count: l.count }))}
        />
      </Section>
      <Section
        id="section-bots"
        title={t("section.bots.title")}
        description={t("section.bots.desc")}
      >
        {data.botClicks2.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">{t("noBot")}</p>
        ) : (
          <BreakdownList
            items={data.botClicks2.map((b) => ({ label: b.bot, count: b.count }))}
          />
        )}
      </Section>
      <Section
        title={t("section.asn.title")}
        description={t("section.asn.desc", { dc: data.datacenterClicks })}
      >
        {data.asnClicks.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">{t("section.asn.empty")}</p>
        ) : (
          <BreakdownList
            items={data.asnClicks.map((a) => ({
              label: a.organization + (a.asn ? ` (AS${a.asn})` : ""),
              count: a.count,
            }))}
          />
        )}
      </Section>
    </div>
  );
}
