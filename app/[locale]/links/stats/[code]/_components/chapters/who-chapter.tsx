"use client";

import { useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import { DeviceChart } from "@/components/links/stats/charts/device-chart";
import { ClickQualitySummary } from "@/components/links/stats/click-quality-summary";
import { ClientAppBreakdown } from "@/components/links/stats/labeled-breakdowns";
import { Breakdown, BreakdownGrid } from "@/components/links/stats/stat-sections";
import { useStatsLabels } from "@/lib/stats-labels";
import { formatNumber } from "@/lib/utils";
import type { LinkStats } from "@/types";

export function WhoChapter({ data }: { data: LinkStats }) {
  const t = useTranslations("stats");
  const labels = useStatsLabels();
  const human = data.humanClicks;
  const clientApps = data.clientAppClicks ?? [];
  return (
    <div id="chapter-who" className="scroll-mt-28">
      <ClickQualitySummary data={data} />
      <BreakdownGrid className="mt-8">
        <Breakdown id="section-device" title={t("section.device.title")}>
          <DeviceChart data={data.deviceClicks} subgrid />
        </Breakdown>
        <Breakdown title={t("section.os.title")}>
          <BreakdownList items={data.osClicks.map((o) => ({ label: labels.os(o.os), count: o.count }))} total={human} subgrid />
        </Breakdown>
        <Breakdown title={t("section.browser.title")}>
          <BreakdownList
            items={data.browserClicks.map((b) => ({ label: labels.browser(b.browser), count: b.count }))}
            total={human}
            subgrid
          />
        </Breakdown>
        {clientApps.length > 0 && (
          <Breakdown id="section-client-app" title={t("section.clientApp.title")} note={t("section.clientApp.note")}>
            <ClientAppBreakdown items={clientApps} total={human} subgrid />
          </Breakdown>
        )}
        {data.languageClicks.length > 0 && (
          <Breakdown title={t("section.language.title")}>
            <BreakdownList
              items={data.languageClicks.map((l) => ({ label: labels.language(l.language), count: l.count }))}
              total={human}
              subgrid
            />
          </Breakdown>
        )}
        <Breakdown id="section-bots" title={t("section.bots.title")}>
          {data.botClicks2.length === 0 ? (
            <p className="text-[13px] text-slate-500 dark:text-slate-400 sm:col-span-full">{t("noBot")}</p>
          ) : (
            <BreakdownList items={data.botClicks2.map((b) => ({ label: labels.bot(b.bot), count: b.count }))} subgrid />
          )}
        </Breakdown>
        {data.asnClicks.length > 0 && (
          <Breakdown
            title={t("section.asn.title")}
            note={data.datacenterClicks > 0 ? t("section.asn.note", { dc: formatNumber(data.datacenterClicks) }) : undefined}
          >
            <BreakdownList
              items={data.asnClicks.map((a) => ({ label: a.organization + (a.asn ? ` · AS${a.asn}` : ""), count: a.count }))}
              subgrid
            />
          </Breakdown>
        )}
      </BreakdownGrid>
    </div>
  );
}
