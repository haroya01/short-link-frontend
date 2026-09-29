"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { StatsHeroCore } from "@/components/links/stats/hero-panel";
import { LiveClickFeedDemo } from "@/components/links/stats/live-click-feed-demo";
import { Link } from "@/i18n/navigation";
import { buildDemoHeadline } from "@/lib/demo-data";
import { formatNumber } from "@/lib/utils";

const DEMO = buildDemoHeadline();

/**
 * The home page's one explainer, shown to signed-out visitors below the shortener: what a link's
 * stats look like, drawn with the same cards the stats screen renders (StatsHeroCore, the live
 * feed) filled with the /demo example data and labelled as such. Nothing moves on its own — the
 * home page is seen over and over.
 */
export function HomeStatsExample() {
  const t = useTranslations("home.stage");
  const tLive = useTranslations("stats.live");
  const tKpi = useTranslations("stats.kpi");

  return (
    <section className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="container max-w-5xl py-16 sm:py-20">
        <h2 className="max-w-2xl text-balance text-headline-sm font-bold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
          {t("title")}
        </h2>
        <p className="mt-3 max-w-xl text-pretty text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
          {t("desc")}
        </p>

        <div className="mt-10 grid gap-10 sm:grid-cols-2 sm:gap-12">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{t("feedTitle")}</h3>
            <p className="mt-1 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">{t("feedDesc")}</p>
            <div aria-hidden className="mt-5 select-none">
              <LiveClickFeedDemo />
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{t("trendTitle")}</h3>
            <p className="mt-1 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">{t("trendDesc")}</p>
            <div aria-hidden className="mt-5 select-none">
              <StatsHeroCore
                label={tKpi("human")}
                caption={`${tKpi("totalClicks")} ${formatNumber(DEMO.total)}`}
                value={DEMO.human}
                series={DEMO.series}
                badge={tLive("example")}
              />
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
            {t("ctaStart")}
          </Link>
          <Link
            href="/demo"
            className="focus-ring inline-flex items-center gap-1 rounded-sm text-[15px] font-medium text-accent-700 underline-offset-4 hover:underline dark:text-accent-400"
          >
            {t("ctaDemo")} <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
