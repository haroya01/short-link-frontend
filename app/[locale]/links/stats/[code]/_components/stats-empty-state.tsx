"use client";

import { useTranslations } from "next-intl";

export function StatsEmptyState() {
  const t = useTranslations("statsEmpty");
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
      <h3 className="text-[17px] font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("title")}</h3>
      <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">{t("description")}</p>
    </div>
  );
}
