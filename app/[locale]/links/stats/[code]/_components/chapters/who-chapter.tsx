"use client";

import { useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import { DeviceChart } from "@/components/links/stats/charts/device-chart";
import { ClickQualitySummary } from "@/components/links/stats/click-quality-summary";
import { ClientAppBreakdown } from "@/components/links/stats/labeled-breakdowns";
import { Section } from "@/components/common/section";
import type { LinkStats } from "@/types";
import { ChapterHeading } from "./chapter-heading";

/** 1장 누가 — 사람/봇 품질, 기기·OS·브라우저·언어, 인앱 브라우저, 봇 정체, ASN. */
export function WhoChapter({ data }: { data: LinkStats }) {
  const t = useTranslations("stats");
  // 인앱 브라우저는 대부분의 링크에서 비어 있다(앱 밖에서만 열린 링크) — 빈 표 대신 섹션을 안 그린다.
  const clientApps = data.clientAppClicks ?? [];
  return (
    <div id="chapter-who" className="scroll-mt-28 space-y-4">
      <ChapterHeading index={1} title={t("chapters.who")} />
      <ClickQualitySummary data={data} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
      {clientApps.length > 0 && (
        <Section
          id="section-client-app"
          title={t("section.clientApp.title")}
          description={t("section.clientApp.desc")}
        >
          <ClientAppBreakdown items={clientApps} />
        </Section>
      )}
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
          <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">{t("noBot")}</p>
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
          <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">{t("section.asn.empty")}</p>
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
