"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useInView } from "@/lib/animations";
import { OnboardingSteps } from "@/components/common/onboarding-steps";

const CHANNELS = [
  ["groupChat", 4],
  ["instagram", 2],
  ["qrPoster", 1],
] as const;

export function EventsIntro() {
  const t = useTranslations("events.intro");
  const steps = (["step1", "step2", "step3"] as const).map((step) => ({
    title: t(`${step}.title`),
    desc: t(`${step}.body`),
  }));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:py-20">
      <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <p className="text-[13px] font-semibold text-accent-700 dark:text-accent-400">{t("eyebrow")}</p>
          <h1 className="mt-2 break-keep text-headline-sm font-bold tracking-headline text-slate-900 dark:text-slate-100 sm:mt-4 sm:text-headline-md lg:text-headline-lg">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-md break-keep text-[14px] leading-relaxed text-slate-500 dark:text-slate-400 sm:mt-5 sm:text-[15px]">
            {t("subtitle")}
          </p>
          <div className="mt-6 lg:mt-8">
            <a href="/login?next=/events" className={buttonVariants({ variant: "accent", size: "xl" })}>
              {t("ctaLogin")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <p className="mt-3 text-[13px] text-slate-500 dark:text-slate-400">{t("ctaHint")}</p>
          </div>
        </div>
        <Still />
      </div>

      <div className="mt-5">
        <OnboardingSteps steps={steps} />
      </div>
    </div>
  );
}

function Still() {
  const t = useTranslations("events.intro.demo");
  const total = CHANNELS.reduce((sum, [, count]) => sum + count, 0);
  const max = Math.max(...CHANNELS.map(([, count]) => count));
  const { ref, seen } = useInView(0.3);

  return (
    <div
      ref={ref}
      data-reveal={seen ? "on" : "off"}
      aria-hidden
      className="relative mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60 sm:p-6 lg:order-first lg:mt-0"
    >
      <span className="absolute right-4 top-4 text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:right-6 sm:top-6">
        {t("example")}
      </span>
      <div className="max-w-[280px] rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
        <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{t("eventTitle")}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" /> {t("eventDate")}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
          <MapPin className="h-3.5 w-3.5" /> {t("eventPlace")}
        </p>
        <div className="mt-3 rounded-lg bg-accent-700 py-2 text-center text-[12px] font-semibold text-white dark:bg-accent-500 dark:text-slate-950">
          {t("registerButton")}
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">{t("byChannel")}</p>
          <p className="rv-rise text-[12px] tabular-nums text-slate-500 dark:text-slate-400" style={{ animationDelay: "0.7s" }}>
            {t("registered", { count: total, capacity: 20 })}
          </p>
        </div>
        <ul className="mt-3 space-y-2">
          {CHANNELS.map(([key, count], i) => (
            <li key={key} className="flex items-center gap-3 text-[12px]">
              <span className="w-24 shrink-0 truncate text-slate-700 dark:text-slate-300">{t(`channels.${key}`)}</span>
              <span className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                <span
                  className="rv-bar block h-full rounded-full bg-accent-600"
                  style={{ width: `${(count / max) * 100}%`, animationDelay: `${0.2 + i * 0.15}s` }}
                />
              </span>
              <span className="w-4 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
