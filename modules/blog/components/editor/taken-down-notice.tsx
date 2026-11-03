"use client";

import { useLocale, useTranslations } from "next-intl";
import { linksHref } from "@/lib/host";

export function TakenDownNotice({ id, className = "" }: { id?: string; className?: string }) {
  const t = useTranslations("postEditor");
  const locale = useLocale();
  return (
    <div
      id={id}
      role="note"
      data-testid="taken-down-notice"
      className={`border-l-2 border-red-400 py-0.5 pl-3 text-[13px] leading-relaxed text-red-800 dark:border-red-500/60 dark:text-red-200 ${className}`}
    >
      <p className="font-semibold">{t("takenDownTitle")}</p>
      <p className="mt-0.5">
        {t("takenDownBody")}{" "}
        <a
          href={linksHref(`/${locale}/terms`)}
          className="focus-ring rounded font-medium underline underline-offset-2 hover:text-red-900 dark:hover:text-red-100"
        >
          {t("takenDownTerms")}
        </a>
      </p>
    </div>
  );
}
