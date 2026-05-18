import type { Metadata } from "next";
import { ArrowRight, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/section";
import { StatsCards } from "@/components/stats-cards";
import { DailyChart } from "@/components/charts/daily-chart";
import { Heatmap } from "@/components/charts/heatmap";
import { CountryTable } from "@/components/country-table";
import { BreakdownList } from "@/components/breakdown-list";
import { buildDemoStats } from "@/lib/demo-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "demo" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

/**
 * Public showcase that renders the dashboard's actual stats components against synthetic data.
 * Anyone can reach it without an account — the goal is to make "what you'll see after sign-up"
 * concrete instead of asking visitors to imagine it.
 */
export default async function DemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "demo" });
  const data = buildDemoStats();

  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <div className="rounded-lg border border-accent-200 bg-accent-50/40 p-5">
        <div className="flex items-center gap-2 text-xs font-medium text-accent-700">
          <Sparkles className="h-3.5 w-3.5" />
          {t("eyebrow")}
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          {t("title")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{t("lead")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link href="/login">
            <Button size="sm" variant="accent">
              {t("ctaPrimary")} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-900">
            {t("ctaSecondary")}
          </Link>
        </div>
      </div>

      <StatsCards
        total={data.totalClicks}
        human={data.humanClicks}
        bot={data.botClicks}
        unique={data.uniqueClicks}
        timeToFirstClickMinutes={data.timeToFirstClickMinutes}
        velocityRatio={data.velocityRatio}
      />

      <Section title={t("daily.title")} description={t("daily.desc")}>
        <DailyChart data={data.dailyClicks} />
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title={t("heatmap.title")} description={t("heatmap.desc")}>
          <Heatmap data={data.heatmap} />
        </Section>
        <Section title={t("source.title")} description={t("source.desc")}>
          <BreakdownList
            items={data.utmSourceClicks.map((u) => ({ label: u.source, count: u.count }))}
          />
        </Section>
      </div>

      <Section title={t("country.title")} description={t("country.desc")}>
        <CountryTable data={data.countryClicks} />
      </Section>

      <div className="rounded-lg border border-slate-200 bg-white p-5 text-center">
        <p className="text-sm text-slate-700">{t("footerLead")}</p>
        <Link href="/login" className="mt-3 inline-block">
          <Button variant="accent">
            {t("ctaPrimary")} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
