"use client";

import { PowerOff } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button-variants";
import { Link } from "@/i18n/navigation";
import type { LinkDetail } from "@/types";

export function LinkModerationBanner({ detail }: { detail: LinkDetail }) {
  const t = useTranslations("stats.moderation");
  const format = useFormatter();
  const moderation = detail.moderation;
  if (!moderation) return null;

  const date = format.dateTime(new Date(moderation.disabledAt), { dateStyle: "medium" });

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10"
    >
      <p className="flex min-w-0 flex-1 items-start gap-2 text-[13px] leading-relaxed text-red-800 dark:text-red-200">
        <PowerOff aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <span className="font-semibold">{t("title")}</span> {t(`reason.${moderation.reason}`, { date })}{" "}
          {t("visitorEffect")}
        </span>
      </p>
      <Link
        href={`/report?link=${encodeURIComponent(`kurl.me/${detail.shortCode}`)}&reason=OTHER`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        {t("appeal")}
      </Link>
    </div>
  );
}
