"use client";

import { useTranslations } from "next-intl";
import { EventOnboardingScene } from "@/modules/events/components/event-onboarding-scene";
import { OnboardingSteps } from "@/components/common/onboarding-steps";

export function EventsOnboarding() {
  const t = useTranslations("events.intro");
  const steps = (["step1", "step2", "step3"] as const).map((step) => ({
    title: t(`${step}.title`),
    desc: t(`${step}.body`),
  }));

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="sm:grid sm:grid-cols-[minmax(0,1fr)_300px] sm:items-center sm:gap-8">
        <div>
          <h2 className="text-xl font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("title")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{t("subtitle")}</p>
        </div>
        <div className="mt-4 hidden sm:mt-0 sm:block">
          <EventOnboardingScene />
        </div>
      </div>

      <OnboardingSteps steps={steps} />
    </div>
  );
}
