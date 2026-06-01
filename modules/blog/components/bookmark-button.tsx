"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { addBookmark, getBookmarkStatus, removeBookmark } from "@/modules/blog/api/bookmarks";

/**
 * Save-to-reading-list toggle on the public post page. Account-backed: the bookmark is stored per
 * user (`/api/v1/posts/{id}/bookmark`) and shows up in the author's /curation reading list across
 * devices. Anonymous click starts the login flow (same as the like button). Optimistic with
 * rollback on error.
 */
export function BookmarkButton({ postId }: { postId: number }) {
  const t = useTranslations("publicPost");
  const { authenticated, ready, signInWithGoogle } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated) return;
    getBookmarkStatus(postId)
      .then((s) => setSaved(s.bookmarked))
      .catch(() => {});
  }, [ready, authenticated, postId]);

  async function toggle() {
    if (!authenticated) {
      signInWithGoogle();
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next);
    try {
      const s = next ? await addBookmark(postId) : await removeBookmark(postId);
      setSaved(s.bookmarked);
    } catch {
      setSaved(!next);
    } finally {
      setBusy(false);
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
