"use client";

import { useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import { ReferrerChart } from "@/components/links/stats/charts/referrer-chart";
import { Section } from "@/components/common/section";
import type { LinkStats } from "@/types";

export function SourcesTab({ data }: { data: LinkStats }) {
  const t = useTranslations("stats");
  const utmHasAny =
    data.utmSourceClicks.length +
      data.utmMediumClicks.length +
      data.utmCampaignClicks.length +
      data.utmContentClicks.length >
    0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section
          id="section-sources"
          title={t("section.referrerHost.title")}
          description={t("section.referrerHost.desc")}
        >
          <BreakdownList
            items={data.referrerHostClicks.map((r) => ({ label: r.host, count: r.count }))}
          />
        </Section>
        <Section
          title={t("section.referrerUrl.title")}
          description={t("section.referrerUrl.desc")}
        >
          <ReferrerChart data={data.referrerClicks} />
        </Section>
      </div>

      {!utmHasAny ? (
        <Section title={t("section.utm.title")} description={t("section.utm.desc")}>
          <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">{t("noUtm")}</p>
        </Section>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.utmSourceClicks.length > 0 && (
            <Section
              title={t("section.utmSource.title")}
              description={t("section.utmSource.desc")}
            >
              <BreakdownList
                items={data.utmSourceClicks.map((u) => ({ label: u.source, count: u.count }))}
              />
            </Section>
          )}
          {data.utmMediumClicks.length > 0 && (
            <Section
              title={t("section.utmMedium.title")}
              description={t("section.utmMedium.desc")}
            >
              <BreakdownList
                items={data.utmMediumClicks.map((u) => ({ label: u.medium, count: u.count }))}
              />
            </Section>
          )}
          {data.utmCampaignClicks.length > 0 && (
            <Section title={t("section.utm.title")} description={t("section.utm.desc")}>
              <BreakdownList
                items={data.utmCampaignClicks.map((u) => ({
                  label: u.campaign,
                  count: u.count,
                }))}
              />
            </Section>
          )}
          {data.utmContentClicks.length > 0 && (
            <Section
              title={t("section.utmContent.title")}
              description={t("section.utmContent.desc")}
            >
              <BreakdownList
                items={data.utmContentClicks.map((u) => ({ label: u.content, count: u.count }))}
              />
            </Section>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title={t("section.channel.title")} description={t("section.channel.desc")}>
          <BreakdownList
            items={data.channelClicks.map((c) => ({ label: c.channel, count: c.count }))}
          />
        </Section>
        <Section
          title={t("section.srcChannel.title")}
          description={t("section.srcChannel.desc")}
        >
          {data.sourceChannelClicks.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              {t("section.srcChannel.empty")}
            </p>
          ) : (
            <BreakdownList
              items={data.sourceChannelClicks.map((s) => ({ label: s.source, count: s.count }))}
            />
          )}
        </Section>
      </div>
    </div>
  );
}
