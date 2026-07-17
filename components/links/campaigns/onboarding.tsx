"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * Campaigns wedge — QR 캠페인 0개일 때 노출. 단일 패널 안에 "배포 → 측정 → 조정" 3스텝만 보여줘 도구가 무엇을 하는지 한눈에 잡히게 하고,
 * 하나의 CTA 가 주인공이 되게 한다. (dashboard-onboarding 과 같은 문법)
 */
export function CampaignOnboarding() {
  const t = useTranslations("campaignsApp.onboarding");
  const steps = t.raw("steps") as { title: string; desc: string }[];

  return (
    <div className="overflow-hidden rounded-xl border border-accent-200 bg-gradient-to-br from-accent-50/60 via-white to-white p-6 shadow-sm dark:border-accent-500/30 dark:from-accent-500/10 dark:via-slate-900 dark:to-slate-900">
      <div className="flex items-center gap-2 text-xs font-medium text-accent-700 dark:text-accent-400">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        {t("eyebrow")}
      </div>
      <h2 className="mt-1 text-xl font-semibold tracking-headline text-slate-900 dark:text-slate-100">
        {t("title")}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{t("body")}</p>

      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50"
          >
            <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
              {i + 1}
            </div>
            <p className="mt-2.5 text-sm font-medium text-slate-900 dark:text-slate-100">{s.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{s.desc}</p>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link href="/campaigns/new">
          <Button variant="accent">
            {t("createCta")} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </Link>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("createHint")}</p>
      </div>
    </div>
  );
}
