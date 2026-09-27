"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { DashboardOnboardingScene } from "@/components/common/onboarding-scenes";
import { OnboardingSteps } from "@/components/common/onboarding-steps";

/**
 * First-link onboarding panel shown on the dashboard when the user has no links yet. Walks
 * through the three minimum-viable actions (shorten → share → see stats) with clear CTAs so the
 * empty dashboard isn't a dead end.
 */
export function DashboardOnboarding() {
  const t = useTranslations("dashboard.onboarding");
  const steps = [
    { title: t("step1Title"), desc: t("step1Desc") },
    { title: t("step2Title"), desc: t("step2Desc") },
    { title: t("step3Title"), desc: t("step3Desc") },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-accent-200 bg-gradient-to-br from-accent-50/60 via-white to-white p-6 shadow-sm dark:border-accent-500/30 dark:from-accent-500/10 dark:via-slate-900 dark:to-slate-900">
      <div className="sm:grid sm:grid-cols-[minmax(0,1fr)_300px] sm:items-center sm:gap-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-accent-700 dark:text-accent-400">
            <Sparkles className="h-3.5 w-3.5" />
            {t("eyebrow")}
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("title")}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("subtitle")}</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <DashboardOnboardingScene />
        </div>
      </div>

      <OnboardingSteps steps={steps} />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link href="/">
          <Button variant="accent">
            {t("primaryCta")} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <Link
          href="/demo"
          className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          {t("secondaryCta")}
        </Link>
      </div>
    </div>
  );
}
