"use client";

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

  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        type="button"
        onClick={() => toggleFollow(tag)}
        aria-pressed={followed}
        className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
          followed
            ? "bg-accent-600 text-white hover:bg-accent-700"
            : "border border-slate-200 text-slate-600 hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-accent-500/50 dark:hover:text-accent-400"
        }`}
      >
        {followed ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        {followed ? t("tagFollowing") : t("tagFollow")}
      </button>
      <button
        type="button"
        onClick={() => toggleHide(tag)}
        aria-pressed={hidden}
        title={hidden ? t("tagUnhide") : t("tagHide")}
        className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
          hidden
            ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
            : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        }`}
      >
        <EyeOff className="h-3.5 w-3.5" />
        {hidden ? t("tagUnhide") : t("tagHide")}
      </button>
    </div>
  );
}
