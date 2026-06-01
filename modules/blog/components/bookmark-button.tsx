"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { addBookmark, isBookmarked, removeBookmark } from "@/modules/blog/api/curation";

/**
 * Save-to-reading-list toggle on the public post page. FRONT-END-ONLY MOCK: the bookmark lives in
 * localStorage (see modules/blog/api/curation.ts) and shows up in the author's /curation reading
 * list. No backend, no auth — it's a per-browser preference until a real endpoint lands.
 *
 * Bookmarked state is read in an effect (post-mount) so SSR and first paint stay unbookmarked and
 * we never hydration-mismatch on localStorage.
 */
export function BookmarkButton({
  postId,
  username,
  title,
  slug,
}: {
  postId: number;
  username: string;
  title: string;
  slug: string;
}) {
  const t = useTranslations("publicPost");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isBookmarked(postId));
  }, [postId]);

  function toggle() {
    if (saved) {
      removeBookmark(postId);
      setSaved(false);
    } else {
      addBookmark({ id: postId, username, title, slug });
      setSaved(true);
    }
  }

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
