"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getLikeStatus, likePost, unlikePost } from "@/modules/blog/api/likes";
import { useOptimisticToggle } from "@/modules/blog/lib/use-optimistic-toggle";
import { useLikeFailed } from "@/hooks/use-like-failed";
import { dockButton } from "@/modules/blog/components/dock-button";
import { ACTION_ICON, actionIconButton } from "@/modules/blog/components/action-icon-button";

/**
 * Like (공감) toggle. Shows the public count for everyone; the liked state loads for signed-in
 * users. Anonymous click starts the login flow. Optimistic with rollback on error.
 */
export function LikeButton({
  postId,
  initialCount,
  postTitle,
  variant = "icon",
}: {
  postId: number;
  initialCount: number;
  /** Post title, scoped into the aria-label so a screen reader hears which post the button acts on
      when several like buttons share a page (e.g. header + footer clusters). */
  postTitle?: string;
  variant?: "icon" | "dock";
}) {
  const t = useTranslations("publicPost");
  // Pop only on click (not when the liked state loads from the server) — same gate as the follow/구독 button.
  const [interacted, setInteracted] = useState(false);
  const likeFailed = useLikeFailed();
  const {
    on: liked,
    count = 0,
    toggle,
  } = useOptimisticToggle({
    depKey: postId,
    syncKey: `like:${postId}`,
    signInReason: "like",
    onError: likeFailed,
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
      aria-label={postTitle ? t("likePost", { title: postTitle }) : t("like")}
      title={variant === "icon" ? t("like") : undefined}
      className={
        variant === "dock"
          ? cn(dockButton(liked), count > 0 && "content-center gap-0.5")
          : cn(actionIconButton(liked), count > 0 && "inline-flex w-auto items-center justify-center gap-1.5 px-2.5")
      }
    >
      {/* Keyed by state so it remounts + replays the pop on each toggle (only after a click). */}
      <span key={liked ? "on" : "off"} className={`inline-flex ${interacted ? "subscribe-pop" : ""}`}>
        <Heart
          className={
            variant === "dock"
              ? `${count > 0 ? "h-4 w-4" : "h-[18px] w-[18px]"} ${liked ? "fill-current" : ""}`
              : `${ACTION_ICON} ${liked ? "fill-accent-600 text-accent-600" : ""}`
          }
        />
      </span>
      {count > 0 && (
        <span
          data-testid="like-count"
          className={cn(
            "tabular-nums",
            variant === "dock" ? "text-[10px] font-semibold leading-none" : "text-[13px] font-medium",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
