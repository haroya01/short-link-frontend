"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { useBookmarks } from "@/modules/blog/lib/use-bookmarks";

/** Rendered as a sibling of the row's post links (never nested inside an `<a>`), and stops propagation
 *  so clicking it never also triggers the row's navigation. */
export function FeedCardBookmark({
  postId,
  username,
  slug,
  corner = false,
  overImage = false,
}: {
  postId: number;
  username: string;
  slug: string;
  corner?: boolean;
  overImage?: boolean;
}) {
  const t = useTranslations("publicFeed");
  const { isSaved, toggle } = useBookmarks();
  const saved = isSaved(username, slug);
  // Pop only on click (not when the store hydrates the saved state) — same gate as the follow/구독 button.
  const [interacted, setInteracted] = useState(false);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setInteracted(true);
        void toggle(postId, username, slug);
      }}
      aria-pressed={saved}
      aria-label={saved ? t("bookmarkOn") : t("bookmark")}
      title={saved ? t("bookmarkOn") : t("bookmark")}
      className={`grid place-items-center rounded-full transition-[opacity,transform,background-color,color] duration-300 ease-[var(--ease)] hover:text-accent-700 focus-ring motion-reduce:transform-none dark:hover:text-accent-300 ${
        corner
          ? overImage
            ? "h-8 w-8 bg-white ring-1 ring-slate-200 hover:bg-accent-50 dark:bg-slate-900 dark:ring-slate-700 dark:hover:bg-slate-800"
            : "h-8 w-8 hover:bg-accent-50 dark:hover:bg-accent-500/15"
          : "touch-target h-7 w-7 hover:bg-accent-50 dark:hover:bg-accent-500/15"
      } ${
        saved
          ? "scale-100 text-accent-600 opacity-100 dark:text-accent-400"
          : `scale-90 opacity-0 focus-visible:scale-100 focus-visible:opacity-100 group-hover:scale-100 group-hover:opacity-100 [@media(hover:none)]:scale-100 [@media(hover:none)]:opacity-100 ${
              corner ? "text-slate-600 dark:text-slate-300" : "text-slate-500 dark:text-slate-400"
            }`
      }`}
    >
      {/* Keyed by state so it remounts + replays the pop on each toggle (only after a click). */}
      <span key={saved ? "on" : "off"} className={`inline-flex ${interacted ? "subscribe-pop" : ""}`}>
        <Bookmark className={`${corner ? "h-[18px] w-[18px]" : "h-3.5 w-3.5"} ${saved ? "fill-accent-600 dark:fill-accent-400" : ""}`} />
      </span>
    </button>
  );
}
