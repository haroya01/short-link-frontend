"use client";

import { Bell, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSeriesSubscriptions } from "@/modules/blog/lib/use-series-subscriptions";

/**
 * Subscribe / unsubscribe to a series ("구독") — the series equivalent of following an author. New
 * episodes of subscribed series surface in the reader's following feed. Reads/writes the shared
 * {@link useSeriesSubscriptions} store (one fetch for the whole feed); anonymous click → login.
 */
export function SeriesSubscribeButton({ seriesId }: { seriesId: number }) {
  const t = useTranslations("publicFeed");
  const { isSubscribed, toggle } = useSeriesSubscriptions();
  const on = isSubscribed(seriesId);

  return (
    <button
      type="button"
      onClick={() => void toggle(seriesId)}
      aria-pressed={on}
      className={`touch-target inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors focus-ring ${
        on
          ? "border border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
          : "bg-accent-600 text-white hover:bg-accent-700"
      }`}
    >
      {on ? <Check className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
      {on ? t("seriesSubscribed") : t("seriesSubscribe")}
    </button>
  );
}
