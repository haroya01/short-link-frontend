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
import { ViralPreview } from "@/components/demo/viral-preview";
import { ProfilePreview } from "@/components/demo/profile-preview";
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
 *
 * <p>Layout groups four narratives so the page reads as a tour, not a wall of charts:
 *   <ol>
 *     <li><b>Engagement</b> — daily clicks + headline KPIs (who's clicking, how fast)</li>
 *     <li><b>Audience</b> — heatmap + utm channels + country split (where they come from)</li>
 *     <li><b>Reach</b> — viral share-card preview (how it looks when shared)</li>
 *     <li><b>Showcase</b> — public profile silhouette (what visitors land on)</li>
 *   </ol>
 *   Each group gets a numbered eyebrow + a short prose lead so the chart reading is anchored to
 *   the user story rather than presented as a free-floating panel.
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
    <div className="container max-w-5xl space-y-10 py-10">
      {/* Hero — refined / luxury surface: tight radius, single accent gradient sliver, no
          decorative blocks competing with the page content below. Larger title typography
          (sm:text-3xl) anchors the page; lead text wraps under, never overflows the gradient
          band. The "sample data" pill sits beside the eyebrow so visitors know up front the
          numbers are seeded — without that, the count-up KPIs read as live metrics and the
          tone of the rest of the tour breaks. */}
      <section className="relative overflow-hidden rounded-2xl border border-accent-200 bg-gradient-to-br from-accent-50 via-white to-white p-6 sm:p-8">
        <span className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent-100/50 blur-3xl" />
        <span className="pointer-events-none absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-accent-50 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-200 bg-white/70 px-3 py-1 text-[11px] font-medium text-accent-700 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {t("eyebrow")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-slate-500 backdrop-blur-sm">
              {t("dataBadge")}
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-600 sm:text-sm">
            {t("lead")}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href="/login">
              <Button size="sm" variant="accent">
                {t("ctaPrimary")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link
              href="/"
              className="text-[12px] text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
            >
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>
      </section>

      {/* Group 1 — Engagement */}
      <GroupHeader
        step={1}
        total={4}
        eyebrow={t("groupEngagement")}
        lead={t("groupEngagementLead")}
        stepLabel={(i, total) => t("stepLabel", { i, total })}
      />
      <StatsCards
        total={data.totalClicks}
        human={data.humanClicks}
        bot={data.botClicks}
        unique={data.uniqueClicks}
        timeToFirstClickMinutes={data.timeToFirstClickMinutes}
        velocityRatio={data.velocityRatio}
      />
      <Section id="section-daily" title={t("daily.title")} description={t("daily.desc")}>
        <DailyChart data={data.dailyClicks} />
      </Section>

      {/* Group 2 — Audience. heatmap on md+, breakdown stacks under on small screens.
          `minmax(0,1fr)` on each track is critical: the heatmap inside has `min-w-[640px]`
          for its 24-hour grid, and a default `1fr` track resolves to `minmax(auto, 1fr)`
          which lets the inner min-content blow the column out — the whole page then gains
          300+ px of horizontal scroll on mobile. Forcing the min to 0 makes the grid item
          respect its `overflow-x-auto` descendant. */}
      <GroupHeader
        step={2}
        total={4}
        eyebrow={t("groupAudience")}
        lead={t("groupAudienceLead")}
        stepLabel={(i, total) => t("stepLabel", { i, total })}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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

      {/* Group 3 — Reach (viral / share cards) */}
      <GroupHeader
        step={3}
        total={4}
        eyebrow={t("groupReach")}
        lead={t("groupReachLead")}
        stepLabel={(i, total) => t("stepLabel", { i, total })}
      />
      <Section title={t("viral.title")} description={t("viral.desc")}>
        <ViralPreview shares={data.sharedLinks} />
      </Section>

      {/* Group 4 — Public profile silhouette */}
      <GroupHeader
        step={4}
        total={4}
        eyebrow={t("groupShowcase")}
        lead={t("groupShowcaseLead")}
        stepLabel={(i, total) => t("stepLabel", { i, total })}
      />
      <Section title={t("profile.title")} description={t("profile.desc")}>
        <ProfilePreview profile={data.profile} />
      </Section>

      {/* Footer CTA — inverted (dark slate-900) so it visually closes the page with weight and
          contrasts the bright hero. Same primary action, different posture. */}
      <section className="overflow-hidden rounded-2xl border border-slate-900 bg-slate-900 px-6 py-8 text-white sm:px-8 sm:py-10">
        <p className="text-[11px] font-medium uppercase tracking-wider text-accent-300">
          {t("footerKicker")}
        </p>
        <p className="mt-2 max-w-xl text-base font-medium leading-relaxed text-white sm:text-lg">
          {t("footerLead")}
        </p>
        <Link href="/login" className="mt-5 inline-block">
          <Button variant="accent">
            {t("ctaPrimary")} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </section>
    </div>
  );
}

/**
 * Eyebrow band that introduces each of the four /demo groups (Engagement / Audience / Reach /
 * Showcase). Numbered step (1/4 … 4/4) plus a short prose lead so each section opens with a
 * mini-narrative instead of dropping the visitor straight into a chart. The accent rule on
 * either side keeps the band visually quiet — no heading-level competition with the Section
 * titles below — so scanning still lands on the chart.
 *
 * <p>Falls back to a single-line rule + label when no lead is provided, but on /demo we always
 * pass one so the four groups read as a guided tour.
 */
function GroupHeader({
  step,
  total,
  eyebrow,
  lead,
  stepLabel,
}: {
  step: number;
  total: number;
  eyebrow: string;
  lead?: string;
  stepLabel: (i: number, total: number) => string;
}) {
  return (
    <div className="pt-2">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-600">
          {stepLabel(step, total)}
        </span>
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent-700">
          {eyebrow}
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-accent-200/80 to-transparent" />
      </div>
      {lead && (
        <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-slate-500">{lead}</p>
      )}
    </div>
  );
}
