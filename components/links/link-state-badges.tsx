"use client";

import { useTranslations } from "next-intl";
import { linkExpiry } from "@/lib/link-expiry";

export function LinkStateBadges({
  expiresAt,
  timezone,
  passwordProtected = false,
}: {
  expiresAt: string | null | undefined;
  timezone?: string;
  passwordProtected?: boolean;
}) {
  const t = useTranslations("linkState");
  const expiry = linkExpiry(expiresAt, { timezone });
  return (
    <>
      {expiry?.kind === "expired" && (
        <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{t("expired")}</span>
      )}
      {expiry?.kind === "soon" && (
        <span className="shrink-0 text-xs font-medium text-amber-700 dark:text-amber-400">
          {expiry.days === 0 ? t("expiresToday") : t("expiresIn", { days: expiry.days })}
        </span>
      )}
      {passwordProtected && (
        <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{t("password")}</span>
      )}
    </>
  );
}
