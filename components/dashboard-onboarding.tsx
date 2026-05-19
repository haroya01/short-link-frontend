"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "./ui/button";

/**
 * First-link onboarding panel shown on the dashboard when the user has no links yet. Walks
 * through the three minimum-viable actions (shorten → share → see stats) with clear CTAs so the
 * empty dashboard isn't a dead end.
 */
export function DashboardOnboarding() {
  const t = useTranslations("dashboard.onboarding");
  const steps = [
    { num: 1, title: t("step1Title"), desc: t("step1Desc") },
    { num: 2, title: t("step2Title"), desc: t("step2Desc") },
    { num: 3, title: t("step3Title"), desc: t("step3Desc") },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-accent-200 bg-gradient-to-br from-accent-50/60 via-white to-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-accent-700">
        <Sparkles className="h-3.5 w-3.5" />
        {t("eyebrow")}
      </div>
      <h2 className="mt-1 text-xl font-semibold tracking-headline text-slate-900">{t("title")}</h2>
      <p className="mt-1 text-sm text-slate-600">{t("subtitle")}</p>

      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {steps.map((s) => (
          <li key={s.num} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {s.num}
            </div>
            <p className="mt-2.5 text-sm font-medium text-slate-900">{s.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{s.desc}</p>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link href="/">
          <Button variant="accent">
            {t("primaryCta")} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <Link
          href="/demo"
          className="text-xs text-slate-500 hover:text-slate-900"
        >
          {t("secondaryCta")}
        </Link>
      </div>
    </div>
  );
}
