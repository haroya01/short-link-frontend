"use client";

import { useLocale, useTranslations } from "next-intl";
import { linksHref } from "@/lib/host";

export function TakenDownNotice({ id, className = "" }: { id?: string; className?: string }) {
  const t = useTranslations("postEditor");
  const locale = useLocale();
  return (
    <div id={id} role="status" data-testid="taken-down-notice" className={`max-w-prose pt-1 ${className}`}>
      <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
        <strong className="block text-[14px] font-semibold text-red-700 dark:text-red-400">{t("takenDownTitle")}</strong>
        {t("takenDownBody")}
      </p>
      <a
        href={linksHref(`/${locale}/terms`)}
        className="touch-target focus-ring mt-1.5 inline-block rounded text-[13px] font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900 dark:text-slate-100 dark:decoration-slate-600 dark:hover:decoration-slate-100"
      >
        {t("takenDownTerms")}
      </a>
    </div>
  );
}
