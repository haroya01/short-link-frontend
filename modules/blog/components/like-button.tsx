"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { getLikeStatus, likePost, unlikePost } from "@/modules/blog/api/likes";
import { showLikes } from "@/modules/blog/lib/public-metrics";
import { useOptimisticToggle } from "@/modules/blog/lib/use-optimistic-toggle";

/**
 * Like (공감) toggle. Shows the public count for everyone; the liked state loads for signed-in
 * users. Anonymous click starts the login flow. Optimistic with rollback on error.
 */
export function LikeButton({ postId, initialCount }: { postId: number; initialCount: number }) {
  const t = useTranslations("publicPost");
  // Pop only on click (not when the liked state loads from the server) — same gate as the follow/구독 button.
  const [interacted, setInteracted] = useState(false);
  const {
    on: liked,
    count,
    toggle,
  } = useOptimisticToggle({
    depKey: postId,
    syncKey: `like:${postId}`,
    initialCount,
    load: () => getLikeStatus(postId).then((s) => ({ on: s.liked, count: s.likeCount })),
    mutate: (next) =>
      (next ? likePost(postId) : unlikePost(postId)).then((s) => ({
        on: s.liked,
        count: s.likeCount,
      })),
  });

  return (
    <button
      type="button"
      onClick={() => {
        setInteracted(true);
        toggle();
      }}
      aria-pressed={liked}
      aria-label={t("like")}
      className={`touch-target inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-[14px] font-medium transition-colors focus-ring ${
        liked
          ? "text-accent-700 dark:text-accent-400"
          : "text-slate-500 hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400"
      }`}
    >
      {/* Keyed by state so it remounts + replays the pop on each toggle (only after a click). */}
      <span key={liked ? "on" : "off"} className={`inline-flex ${interacted ? "subscribe-pop" : ""}`}>
        <Heart className={`h-4 w-4 ${liked ? "fill-accent-600 text-accent-600" : ""}`} />
      </span>
      {/* Hide a bare "0" — show the count only once the post has a like (or the viewer adds one).
          aria-live so a screen reader hears the count change when the viewer toggles. */}
      <span aria-live="polite">{showLikes(count ?? 0) ? count ?? 0 : ""}</span>
    </button>
  );
}
