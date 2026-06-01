"use client";

import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { useBookmarks } from "@/modules/blog/lib/use-bookmarks";

/**
 * Save-to-reading-list toggle that lives in the top-right of a feed card, so a post can be saved
 * without opening it. Quiet by default: hidden until the row is hovered/focused (revealed always on
 * touch, where there's no hover, and whenever the post is already saved so its state stays visible).
 * Reads/writes the shared {@link useBookmarks} store, so it's one network call for the whole feed and
 * every card for the same post stays in sync. Anonymous click starts the login flow.
 *
 * Rendered as a sibling of the card's post links (never nested inside an `<a>`), and stops propagation
 * so clicking it never also triggers the row's navigation.
 */
export function FeedCardBookmark({
  postId,
  username,
  slug,
}: {
  postId: number;
  username: string;
  slug: string;
}) {
  const t = useTranslations("publicFeed");
  const { isSaved, toggle } = useBookmarks();
  const saved = isSaved(username, slug);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle(postId, username, slug);
      }}
      aria-pressed={saved}
      aria-label={saved ? t("bookmarkOn") : t("bookmark")}
      title={saved ? t("bookmarkOn") : t("bookmark")}
      className={`grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-all hover:bg-accent-50 hover:text-accent-700 focus-ring dark:text-slate-500 dark:hover:bg-accent-500/10 dark:hover:text-accent-300 ${
        saved
          ? "text-accent-600 opacity-100 dark:text-accent-400"
          : "opacity-0 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      }`}
    >
      <Bookmark className={`h-[18px] w-[18px] ${saved ? "fill-accent-600 dark:fill-accent-400" : ""}`} />
    </button>
  );
}
