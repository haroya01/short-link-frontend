"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { addBookmark, getBookmarkStatus, removeBookmark } from "@/modules/blog/api/bookmarks";
import { useOptimisticToggle } from "@/modules/blog/lib/use-optimistic-toggle";
import { dockButton } from "@/modules/blog/components/dock-button";
import { ACTION_ICON, actionIconButton } from "@/modules/blog/components/action-icon-button";

/**
 * Save-to-reading-list toggle on the public post page. Account-backed: the bookmark is stored per
 * user (`/api/v1/posts/{id}/bookmark`) and shows up in the author's /curation reading list across
 * devices. Anonymous click starts the login flow (same as the like button). Optimistic with
 * rollback on error.
 */
export function BookmarkButton({ postId, variant = "icon" }: { postId: number; variant?: "icon" | "dock" }) {
  const t = useTranslations("publicPost");
  // Pop only on click (not when the saved state loads from the server) — same gate as the follow/구독 button.
  const [interacted, setInteracted] = useState(false);
  const { on: saved, toggle } = useOptimisticToggle({
    depKey: postId,
    syncKey: `bookmark:${postId}`,
    signInReason: "bookmark",
    load: () => getBookmarkStatus(postId).then((s) => ({ on: s.bookmarked })),
    mutate: (next) =>
      (next ? addBookmark(postId) : removeBookmark(postId)).then((s) => ({ on: s.bookmarked })),
  });

  return (
    <button
      type="button"
      onClick={() => {
        setInteracted(true);
        toggle();
      }}
      aria-pressed={saved}
      aria-label={saved ? t("bookmarkOn") : t("bookmark")}
      title={variant === "icon" ? (saved ? t("bookmarkOn") : t("bookmark")) : undefined}
      className={variant === "dock" ? dockButton(saved) : actionIconButton(saved)}
    >
      {/* Keyed by state so it remounts + replays the pop on each toggle (only after a click). */}
      <span key={saved ? "on" : "off"} className={`inline-flex ${interacted ? "subscribe-pop" : ""}`}>
        <Bookmark
          className={
            variant === "dock"
              ? `h-[18px] w-[18px] ${saved ? "fill-current" : ""}`
              : `${ACTION_ICON} ${saved ? "fill-accent-600 text-accent-600" : ""}`
          }
        />
      </span>
    </button>
  );
}
