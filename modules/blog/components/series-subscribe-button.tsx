"use client";

import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSeriesSubscriptions } from "@/modules/blog/lib/use-series-subscriptions";
import { followToggleClass } from "@/modules/blog/lib/follow-toggle";

/**
 * Subscribe / unsubscribe to a series ("구독") — the series equivalent of following an author. New
 * episodes of subscribed series surface in the reader's following feed. Reads/writes the shared
 * {@link useSeriesSubscriptions} store (one fetch for the whole feed); anonymous click → login.
 */
export function SeriesSubscribeButton({
  seriesId,
  quiet = false,
}: {
  seriesId: number;
  /** Green outline instead of the fill — for series cards repeated down a feed. */
  quiet?: boolean;
}) {
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
      // Fixed height + a border in *both* states (transparent when filled) so toggling never changes
      // the box height — only the width flexes with the label. `transition-colors` crossfades the
      // fill/outline swap so 구독 ↔ 구독중 eases rather than snapping.
      className={followToggleClass(on, true, quiet)}
    >
      {/* Keyed by state so it remounts + replays the pop on each 구독 ↔ 구독중 toggle. */}
      <span
        key={on ? "on" : "off"}
        className={`${interacted ? "subscribe-pop" : ""} inline-flex items-center gap-1`}
      >
        {on ? <Check className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
        {on ? t("seriesSubscribed") : t("seriesSubscribe")}
      </span>
    </button>
  );
}
