"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { listMyLinks } from "@/lib/api";
import type { MyLink } from "@/types";

type Props = {
  /** Bumps when the parent reloads — re-checks expiring count after creates/deletes. */
  reloadKey?: number;
  /** Click handler — typically sets the parent filter to expiry=EXPIRING_SOON. */
  onShowAll?: () => void;
};

const DISMISS_KEY = "kurl:expiring-banner-dismissed-until";

export function ExpiringSoonBanner({ reloadKey, onShowAll }: Props) {
  const t = useTranslations("expiringBanner");
  const [items, setItems] = useState<MyLink[] | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Hide for 24h once dismissed so we don't nag the user every navigation. New expirations
    // breaking through within the day are still worth surfacing — but not at every reload.
    if (typeof window !== "undefined") {
      const until = window.localStorage.getItem(DISMISS_KEY);
      if (until && Number(until) > Date.now()) setDismissed(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listMyLinks({ expiry: "EXPIRING_SOON", size: 5 })
      .then((page) => {
        if (!cancelled) setItems(page.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (dismissed || !items || items.length === 0) return null;

  function dismiss() {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">{t("title", { count: items.length })}</p>
        <p className="mt-0.5 text-xs text-amber-800/80">{t("hint")}</p>
      </div>
      {onShowAll && (
        <button
          type="button"
          onClick={onShowAll}
          className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium hover:bg-amber-200"
        >
          {t("showAll")}
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismiss")}
        className="rounded-full p-1 hover:bg-amber-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
