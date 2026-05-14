"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { getProfileStats } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import { useToast } from "@/components/ui/toast";
import { StatsCards } from "@/components/stats-cards";
import { DailyChart } from "@/components/charts/daily-chart";
import { Heatmap } from "@/components/charts/heatmap";
import { CountryTable } from "@/components/country-table";
import { BreakdownList } from "@/components/breakdown-list";
import { Section } from "@/components/section";
import type { ProfileStats } from "@/types";

/**
 * Owner's profile visit stats — same chart components as the per-link {@code /stats/[code]}
 * page, fed from {@code GET /api/v1/users/me/profile/stats}. Single page covers daily / hourly
 * heatmap / country / device / referrer / source channel / UTM breakdowns so the owner sees
 * the same depth they get for short links.
 */
export default function ProfileStatsPage() {
  const t = useTranslations("settings.profile.stats");
  const tBreak = useTranslations("stats.breakdown");
  const router = useRouter();
  const locale = useLocale();
  const { authenticated, ready } = useAuth();
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [data, setData] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !authenticated) router.replace(`/${locale}/login`);
  }, [ready, authenticated, locale, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getProfileStats());
    } catch (err) {
      toast(errorMessage(err, t("loadFailed")), "error");
    } finally {
      setLoading(false);
    }
  }, [errorMessage, t, toast]);

  useEffect(() => {
    if (authenticated) void load();
  }, [authenticated, load]);

  if (!ready || !authenticated) {
    return <div className="container max-w-3xl py-16 text-sm text-slate-500">…</div>;
  }
  if (loading || !data) {
    return (
      <div className="container max-w-3xl py-16 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl space-y-6 py-12">
      <div>
        <Link
          href={`/${locale}/profile/edit`}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("backToEditor")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("intro")}</p>
      </div>

      <StatsCards
        total={data.totalVisits}
        human={data.humanVisits}
        bot={data.botVisits}
        unique={data.uniqueVisits}
      />

      <Section title={t("daily.title")} description={t("daily.desc")}>
        <DailyChart data={data.dailyVisits} />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t("heatmap.title")} description={t("heatmap.desc")}>
          <Heatmap data={data.heatmap} />
        </Section>
        <Section title={t("countries.title")} description={t("countries.desc")}>
          <CountryTable data={data.countryVisits} />
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t("devices.title")} description={t("devices.desc")}>
          <BreakdownList
            items={data.deviceVisits.map((d) => ({ label: d.device || tBreak("unknown"), count: d.count }))}
          />
        </Section>
        <Section title={t("browsers.title")} description={t("browsers.desc")}>
          <BreakdownList
            items={data.browserVisits.map((b) => ({ label: b.browser || tBreak("unknown"), count: b.count }))}
          />
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t("referrers.title")} description={t("referrers.desc")}>
          <BreakdownList
            items={data.referrerHostVisits.map((r) => ({ label: r.host || tBreak("direct"), count: r.count }))}
          />
        </Section>
        <Section title={t("channels.title")} description={t("channels.desc")}>
          <BreakdownList
            items={data.sourceChannelVisits.map((s) => ({ label: s.source || tBreak("unknown"), count: s.count }))}
          />
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
