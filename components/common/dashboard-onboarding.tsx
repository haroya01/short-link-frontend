"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DashboardOnboardingScene } from "@/components/common/onboarding-scenes";
import { OnboardingSteps } from "@/components/common/onboarding-steps";

/**
 * First-link onboarding panel shown on the dashboard when the user has no links yet. The page
 * header's "새 링크" stays the one primary action; the panel only explains the three steps.
 */
export function DashboardOnboarding() {
  const t = useTranslations("dashboard.onboarding");
  const steps = [
    { title: t("step1Title"), desc: t("step1Desc") },
    { title: t("step2Title"), desc: t("step2Desc") },
    { title: t("step3Title"), desc: t("step3Desc") },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="sm:grid sm:grid-cols-[minmax(0,1fr)_300px] sm:items-center sm:gap-8">
        <div>
          <h2 className="text-xl font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("title")}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("subtitle")}</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <DashboardOnboardingScene />
        </div>
      </div>

      <OnboardingSteps steps={steps} />

      <div className="mt-5">
        <Link
          href="/demo"
          className="focus-ring inline-flex items-center gap-1 rounded-sm text-[13px] font-medium text-accent-700 underline-offset-4 hover:underline dark:text-accent-400"
        >
          {t("secondaryCta")} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
