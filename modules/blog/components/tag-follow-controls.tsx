"use client";

import { useState } from "react";
import { Check, EyeOff, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTagPrefs } from "@/modules/blog/lib/use-tag-prefs";

/**
 * Follow / hide controls for a topic, shown on the tag feed page. Per-device (localStorage) — lets a
 * reader curate "보고싶은 태그만": followed tags surface in their personal strip; hidden tags drop out
 * of the feed. No account required.
 */
export function TagFollowControls({ tag }: { tag: string }) {
  const t = useTranslations("publicFeed");
  const { isFollowed, isHidden, toggleFollow, toggleHide } = useTagPrefs();
  const followed = isFollowed(tag);
  const hidden = isHidden(tag);
  // Pop only on an actual click, not on page entry — the keyed span replays its CSS animation on
  // every mount otherwise, so gate the class until the user has toggled.
  const [interacted, setInteracted] = useState(false);
  const pop = interacted ? "subscribe-pop" : "";

  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          setInteracted(true);
          toggleFollow(tag);
        }}
        aria-pressed={followed}
        // Fixed height + a border in both states (transparent when filled) so toggling never shifts
        // the row — the posts below used to jump when the followed fill added/removed its border.
        className={`focus-ring inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
          followed
            ? "border-transparent bg-accent-700 text-white hover:bg-accent-800"
            : "border-slate-200 text-slate-600 hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-accent-500/50 dark:hover:text-accent-400"
        }`}
      >
        <span key={followed ? "on" : "off"} className={`${pop} inline-flex items-center gap-1.5`}>
          {followed ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {followed ? t("tagFollowing") : t("tagFollow")}
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          setInteracted(true);
          toggleHide(tag);
        }}
        aria-pressed={hidden}
        title={hidden ? t("tagUnhide") : t("tagHide")}
        className={`focus-ring inline-flex h-8 items-center gap-1.5 rounded-full border border-transparent px-3 text-[13px] font-medium transition-colors ${
          hidden
            ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
            : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        }`}
      >
        <span key={hidden ? "on" : "off"} className={`${pop} inline-flex items-center gap-1.5`}>
          <EyeOff className="h-3.5 w-3.5" />
          {hidden ? t("tagUnhide") : t("tagHide")}
        </span>
      </button>
    </div>
  );
}
