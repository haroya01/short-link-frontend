"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { getLikeStatus, likePost, unlikePost } from "@/modules/blog/api/likes";
import { showLikes } from "@/modules/blog/lib/public-metrics";

/**
 * Like (공감) toggle. Shows the public count for everyone; the liked state loads for signed-in
 * users. Anonymous click starts the login flow. Optimistic with rollback on error.
 */
export function LikeButton({ postId, initialCount }: { postId: number; initialCount: number }) {
  const t = useTranslations("publicPost");
  const { authenticated, ready, signInWithGoogle } = useAuth();
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated) return;
    getLikeStatus(postId)
      .then((s) => {
        setCount(s.likeCount);
        setLiked(s.liked);
      })
      .catch(() => {});
  }, [ready, authenticated, postId]);

  async function toggle() {
    if (!authenticated) {
      signInWithGoogle();
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      const s = next ? await likePost(postId) : await unlikePost(postId);
      setLiked(s.liked);
      setCount(s.likeCount);
    } catch {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={t("like")}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 ${
        liked
          ? "border-accent-300 bg-accent-50 text-accent-700"
          : "border-slate-200 text-slate-500 hover:border-accent-300 hover:text-accent-700"
      }`}
    >
      <Heart className={`h-4 w-4 ${liked ? "fill-accent-600 text-accent-600" : ""}`} />
      {/* Hide a bare "0" — show the count only once the post has a like (or the viewer adds one). */}
      {showLikes(count) && count}
    </button>
  );
}
