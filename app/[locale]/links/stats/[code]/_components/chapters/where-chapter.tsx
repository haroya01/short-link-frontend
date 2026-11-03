"use client";

import { useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import { ChannelDepthTable } from "@/components/links/stats/channel-depth-table";
import { ReferrerChart } from "@/components/links/stats/charts/referrer-chart";
import { FetchSiteBreakdown, RegionBreakdown } from "@/components/links/stats/labeled-breakdowns";
import { Breakdown, BreakdownGrid, countryItems } from "@/components/links/stats/stat-sections";
import { sourceBreakdown } from "@/lib/stats-sources";
import { useStatsLabels } from "@/lib/stats-labels";
import type { LinkStats } from "@/types";

export function WhereChapter({ data }: { data: LinkStats }) {
  const t = useTranslations("stats");
  const labels = useStatsLabels();
  const human = data.humanClicks;
  const channelDepth = data.channelDepth ?? [];
  const fetchSites = data.fetchSiteClicks ?? [];
  const postClicks = data.postClicks ?? [];
  const utm = [
    { key: "utmSource", items: data.utmSourceClicks.map((u) => ({ label: u.source, count: u.count })) },
    { key: "utmMedium", items: data.utmMediumClicks.map((u) => ({ label: u.medium, count: u.count })) },
    { key: "utm", items: data.utmCampaignClicks.map((u) => ({ label: u.campaign, count: u.count })) },
    { key: "utmContent", items: data.utmContentClicks.map((u) => ({ label: u.content, count: u.count })) },
    { key: "utmTerm", items: (data.utmTermClicks ?? []).map((u) => ({ label: u.term, count: u.count })) },
  ].filter((section) => section.items.length > 0);

  return (
    <div id="chapter-where" className="scroll-mt-28 space-y-10">
      <BreakdownGrid>
        <Breakdown id="section-sources" title={t("section.referrerHost.title")}>
          <BreakdownList {...sourceBreakdown(data, labels.channel("direct"))} subgrid />
        </Breakdown>
        <Breakdown title={t("section.channel.title")}>
          <BreakdownList
            items={data.channelClicks.map((c) => ({ label: labels.channel(c.channel), count: c.count }))}
            total={human}
            subgrid
          />
        </Breakdown>
        {data.referrerClicks.length > 0 && (
          <Breakdown title={t("section.referrerUrl.title")}>
            <ReferrerChart data={data.referrerClicks} total={human} subgrid />
          </Breakdown>
        )}
        {data.sourceChannelClicks.length > 0 && (
          <Breakdown title={t("section.srcChannel.title")} aside="?src">
            <BreakdownList
              items={data.sourceChannelClicks.map((s) => ({ label: labels.source(s.source), count: s.count }))}
              total={human}
              subgrid
            />
          </Breakdown>
        )}
        {fetchSites.length > 0 && (
          <Breakdown id="section-fetch-site" title={t("section.fetchSite.title")}>
            <FetchSiteBreakdown items={fetchSites} total={human} subgrid />
          </Breakdown>
        )}
        {postClicks.length > 0 && (
          <Breakdown id="section-post-clicks" title={t("section.postClicks.title")}>
            <BreakdownList
              items={postClicks.map((p) => ({ label: p.title ?? t("postClicks.deleted"), count: p.count }))}
              total={human}
              subgrid
            />
          </Breakdown>
        )}
        {utm.map((section) => (
          <Breakdown key={section.key} title={t(`section.${section.key}.title`)}>
            <BreakdownList items={section.items} total={human} subgrid />
          </Breakdown>
        ))}
        <Breakdown title={t("section.country.title")}>
          <BreakdownList items={countryItems(data.countryClicks, labels)} total={human} subgrid />
        </Breakdown>
        {data.regionClicks.length > 0 && (
          <Breakdown title={t("section.region.title")}>
            <RegionBreakdown items={data.regionClicks} total={human} subgrid />
          </Breakdown>
        )}
        {data.cityClicks.length > 0 && (
          <Breakdown title={t("section.city.title")}>
            <BreakdownList items={data.cityClicks.map((c) => ({ label: c.city, count: c.count }))} total={human} subgrid />
          </Breakdown>
        )}
      </BreakdownGrid>

      {channelDepth.length > 0 && (
        <Breakdown
          id="section-channel-depth"
          title={t("section.channelDepth.title")}
          aside={data.rawSince && data.rawRetentionDays ? t("rawWindow", { days: data.rawRetentionDays }) : undefined}
        >
          <div className="sm:col-span-full">
            <ChannelDepthTable data={channelDepth} timezone={data.timezone} />
          </div>
        </Breakdown>
      )}
    </div>
  );
}
