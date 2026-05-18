"use client";

import { useMemo } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast";
import { buildDemoLinkStats } from "@/lib/demo-data";
import { StatsBody } from "@/app/[locale]/stats/[code]/_components/StatsBody";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";

/**
 * Client wrapper around the shared {@link StatsBody}.
 *
 * <p>This is the single component that makes /demo a 100% mirror of {@code /stats/[code]} —
 * the only differences from the real route are:
 *   <ol>
 *     <li>The data source: synthetic {@link buildDemoLinkStats} instead of {@code getStats()}.
 *     <li>The {@code demo} flag passed into {@link StatsBody}, which suppresses the
 *         public-stats toggle, swaps the live click feed for a scripted placeholder, and
 *         renders a "sign up to manage" notice in the Settings tab.
 *     <li>The thin sample banner at the top.
 *   </ol>
 * No copies of the Header / TabBar / charts; no fake screenshots; no marketing-only chrome.
 */
export function DemoStatsPage() {
  const t = useTranslations("demo");
  const tStats = useTranslations("stats");
  const tResult = useTranslations("result");
  const { toast } = useToast();
  // useMemo so React doesn't rebuild the (seeded but heavy) LinkStats payload on every tab
  // switch — buildDemoLinkStats does a 30-day daily walk + a 168-cell heatmap synthesis.
  const data = useMemo(() => buildDemoLinkStats(), []);
  const shortUrl = `${SITE_URL.replace(/\/$/, "")}/${data.shortCode}`;

  return (
    <div className="container max-w-6xl space-y-5 py-10">
      {/* Sample-data banner — minimal, single line, accent-tinted. Keeps the page honest about
          the numbers being seeded without competing with the dashboard chrome below. The CTA
          is intentionally low-weight so the eye lands on the charts. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent-200 bg-accent-50/60 px-4 py-2.5 text-[12px]">
        <span className="inline-flex items-center gap-2 font-medium text-accent-800">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          {t("sampleBanner")}
        </span>
        <Link
          href="/login"
          className="inline-flex items-center gap-1 font-medium text-accent-700 underline-offset-4 hover:text-accent-800 hover:underline"
        >
          {t("sampleCta")}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <StatsBody
        data={data}
        shortUrl={shortUrl}
        shortCodeLabel={tStats("shortCode")}
        onCopy={() => toast(tResult("copied"), "success")}
        onTick={() => {
          // No-op on /demo — there's no backend to refetch from, and the seeded data is stable
          // across renders by design. The dashboard's stats page bumps a tick counter here on
          // every SSE event so the next getStats() refresh runs; on demo the click feed is
          // scripted and the heatmap / KPIs never need to refresh.
        }}
        demo
      />
    </div>
  );
}
