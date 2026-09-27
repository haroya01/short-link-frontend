"use client";

import { useTranslations } from "next-intl";
import { CampaignOnboardingScene } from "@/components/common/onboarding-scenes";
import { OnboardingSteps } from "@/components/common/onboarding-steps";

/**
 * Campaigns wedge — QR 캠페인 0개일 때 노출. 단일 패널 안에 "배포 → 측정 → 조정" 3스텝만 보여줘 도구가 무엇을 하는지 한눈에 잡히게 하고,
 * 하나의 CTA 가 주인공이 되게 한다. (dashboard-onboarding 과 같은 문법)
 */
export function CampaignOnboarding() {
  const t = useTranslations("campaignsApp.onboarding");
  const steps = t.raw("steps") as { title: string; desc: string }[];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="sm:grid sm:grid-cols-[minmax(0,1fr)_300px] sm:items-center sm:gap-8">
        <div>
          <h2 className="text-xl font-semibold tracking-headline text-slate-900 dark:text-slate-100">
            {t("title")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{t("body")}</p>
        </div>
        <div className="mt-4 hidden sm:mt-0 sm:block">
          <CampaignOnboardingScene />
        </div>
      </div>

      <OnboardingSteps steps={steps} />

    </div>
  );
}
