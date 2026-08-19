"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MyLinksFilters } from "@/lib/api";
import { useMyLinks } from "@/lib/api/links.queries";
import { useAuth } from "@/lib/auth";
import { readStorageString, writeStorageString } from "@/lib/storage-json";

type Props = {
  /** Click handler — typically sets the parent filter to expiry=EXPIRING_SOON. */
  onShowAll?: () => void;
};

const DISMISS_KEY = "kurl:expiring-banner-dismissed-until";
const EXPIRING_FILTERS: MyLinksFilters = { expiry: "EXPIRING_SOON", size: 5 };

export function ExpiringSoonBanner({ onShowAll }: Props) {
  const t = useTranslations("expiringBanner");
  const { ready, authenticated } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  // The dashboard renders this widget while auth is still bootstrapping (!ready), so gate the query
  // to avoid a guaranteed-401 (anonymous) / doubled 401→refresh (cross-subdomain) authed request.
  const { data } = useMyLinks(EXPIRING_FILTERS, { enabled: ready && authenticated });
  const items = data?.pages[0]?.items ?? [];

  useEffect(() => {
    // Hide for 24h once dismissed so we don't nag the user every navigation. New expirations
    // breaking through within the day are still worth surfacing — but not at every reload.
    const until = readStorageString(DISMISS_KEY);
    if (until && Number(until) > Date.now()) setDismissed(true);
  }, []);

  if (dismissed || items.length === 0) return null;

  function dismiss() {
    setDismissed(true);
    writeStorageString(DISMISS_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">{t("title", { count: items.length })}</p>
        <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-200/70">{t("hint")}</p>
      </div>
      {onShowAll && (
        <button
          type="button"
          onClick={onShowAll}
          className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200 dark:bg-amber-400/20 dark:text-amber-100 dark:hover:bg-amber-400/30"
        >
          {t("showAll")}
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismiss")}
        className="rounded-full p-1 hover:bg-amber-100 dark:hover:bg-amber-400/20"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
