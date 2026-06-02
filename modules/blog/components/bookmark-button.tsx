"use client";

import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { addBookmark, getBookmarkStatus, removeBookmark } from "@/modules/blog/api/bookmarks";
import { useOptimisticToggle } from "@/modules/blog/lib/use-optimistic-toggle";

/**
 * Save-to-reading-list toggle on the public post page. Account-backed: the bookmark is stored per
 * user (`/api/v1/posts/{id}/bookmark`) and shows up in the author's /curation reading list across
 * devices. Anonymous click starts the login flow (same as the like button). Optimistic with
 * rollback on error.
 */
export function BookmarkButton({ postId }: { postId: number }) {
  const t = useTranslations("publicPost");
  const { on: saved, toggle } = useOptimisticToggle({
    depKey: postId,
    load: () => getBookmarkStatus(postId).then((s) => ({ on: s.bookmarked })),
    mutate: (next) =>
      (next ? addBookmark(postId) : removeBookmark(postId)).then((s) => ({ on: s.bookmarked })),
  });

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? t("bookmarkOn") : t("bookmark")}
      className={`touch-target inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-[14px] font-medium transition-colors focus-ring ${
        saved
          ? "text-accent-700 dark:text-accent-400"
          : "text-slate-500 hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400"
      }`}
    >
      <Bookmark className={`h-4 w-4 ${saved ? "fill-accent-600 text-accent-600" : ""}`} />
    </button>
  );
}
