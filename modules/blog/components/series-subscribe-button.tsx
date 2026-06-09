"use client";

import { useState } from "react";
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
  // Pop only on click, not on mount (the keyed span replays its animation on every mount otherwise).
  const [interacted, setInteracted] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        setInteracted(true);
        void toggle(seriesId);
      }}
      aria-pressed={on}
      // Fixed height + min-width + a border in *both* states (transparent when filled) so toggling
      // never changes the box size — 구독("Bell 구독") ↔ 구독중("Check 구독중") stay the exact same
      // size + hitbox(centered in min-w), no jump. transition-colors crossfades the fill/outline swap.
      className={`touch-target inline-flex h-8 min-w-[88px] shrink-0 items-center justify-center gap-1 rounded-full border px-3.5 text-[13px] font-semibold transition-colors duration-200 focus-ring ${
        on
          ? "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
          : "border-transparent bg-accent-600 text-white hover:bg-accent-700"
      }`}
    >
      {/* Keyed by state so it remounts + replays the pop on each 구독 ↔ 구독중 toggle. */}
      <span
        key={on ? "on" : "off"}
        className={`${interacted ? "subscribe-pop" : ""} inline-flex items-center gap-1`}
      >
        {on ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {on ? t("seriesSubscribed") : t("seriesSubscribe")}
      </span>
    </button>
  );
}
