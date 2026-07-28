"use client";

import { useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import { ChannelDepthTable } from "@/components/links/stats/channel-depth-table";
import { ReferrerChart } from "@/components/links/stats/charts/referrer-chart";
import { CountryTable } from "@/components/links/stats/country-table";
import { FetchSiteBreakdown } from "@/components/links/stats/labeled-breakdowns";
import { Section } from "@/components/common/section";
import { cn } from "@/lib/utils";
import type { LinkStats } from "@/types";
import { ChapterHeading } from "./chapter-heading";

/** 3장 어디서 — 유입(호스트/URL/채널 깊이/UTM/채널/글), 지리(국가/지역/도시). */
export function WhereChapter({ data }: { data: LinkStats }) {
  const t = useTranslations("stats");
  const utmTermClicks = data.utmTermClicks ?? [];
  const utmHasAny =
    data.utmSourceClicks.length +
      data.utmMediumClicks.length +
      data.utmCampaignClicks.length +
      data.utmContentClicks.length +
      utmTermClicks.length >
    0;
  const channelDepth = data.channelDepth ?? [];
  const fetchSites = data.fetchSiteClicks ?? [];
  const postClicks = data.postClicks ?? [];

  // fetch-site 는 옛 브라우저·과거 클릭에 값이 아예 없고, 글 귀속은 링크를 글에 실은 적이 있어야
  // 생긴다 — 둘 다 대부분의 링크에서 빈 배열이다. 하나만 있을 때 반쪽 카드가 남지 않도록 열 수를
  // 실제 개수에 맞춘다(빈 표는 애초에 안 그린다).
  const arrivalSections = [
    fetchSites.length > 0 && (
      <Section
        key="fetch-site"
        id="section-fetch-site"
        title={t("section.fetchSite.title")}
        description={t("section.fetchSite.desc")}
      >
        <FetchSiteBreakdown items={fetchSites} />
      </Section>
    ),
    postClicks.length > 0 && (
      <Section
        key="post-clicks"
        id="section-post-clicks"
        title={t("section.postClicks.title")}
        description={t("section.postClicks.desc")}
      >
        <BreakdownList
          items={postClicks.map((p) => ({
            label: p.title ?? t("postClicks.deleted"),
            count: p.count,
          }))}
        />
      </Section>
    ),
  ].filter(Boolean);

  return (
    <div id="chapter-where" className="scroll-mt-28 space-y-4">
      <ChapterHeading index={3} title={t("chapters.where")} />
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

      {channelDepth.length > 0 && (
        <Section
          id="section-channel-depth"
          title={t("section.channelDepth.title")}
          description={t("section.channelDepth.desc")}
        >
          <ChannelDepthTable data={channelDepth} timezone={data.timezone} />
        </Section>
      )}

      {arrivalSections.length > 0 && (
        <div
          className={cn(
            "grid grid-cols-1 gap-4",
            arrivalSections.length > 1 && "lg:grid-cols-2",
          )}
        >
          {arrivalSections}
        </div>
      )}

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
          {utmTermClicks.length > 0 && (
            <Section title={t("section.utmTerm.title")} description={t("section.utmTerm.desc")}>
              <BreakdownList
                items={utmTermClicks.map((u) => ({ label: u.term, count: u.count }))}
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

      <Section title={t("section.country.title")} description={t("section.country.desc")}>
        <CountryTable data={data.countryClicks} />
      </Section>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
    </div>
  );
}
