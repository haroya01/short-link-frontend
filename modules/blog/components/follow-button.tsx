"use client";

import { useEffect, useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { followUser, getFollowStatus, unfollowUser } from "@/modules/blog/api/follows";

/**
 * Follow / unfollow an author + their follower count. The count is public; the following state
 * loads for signed-in viewers. Anonymous click starts the login flow. Hidden on your own profile.
 * Optimistic with rollback on error.
 */
export function FollowButton({
  username,
  initialFollowerCount,
}: {
  username: string;
  initialFollowerCount: number;
}) {
  const t = useTranslations("publicPost");
  const { authenticated, ready, me, signInWithGoogle } = useAuth();
  const [count, setCount] = useState(initialFollowerCount);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  const isSelf = ready && me?.username === username;

  useEffect(() => {
    if (!ready) return;
    getFollowStatus(username)
      .then((s) => {
        setCount(s.followerCount);
        setFollowing(s.following);
      })
      .catch(() => {});
  }, [ready, username]);

  async function toggle() {
    if (!authenticated) {
      signInWithGoogle();
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      const s = next ? await followUser(username) : await unfollowUser(username);
      setFollowing(s.following);
      setCount(s.followerCount);
    } catch {
      setFollowing(!next);
      setCount((c) => c + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {!isSelf && (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={following}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 ${
            following
              ? "border border-slate-200 text-slate-600 hover:border-slate-300"
              : "bg-accent-600 text-white hover:bg-accent-700"
          }`}
        >
          {following ? (
            <UserCheck className="h-4 w-4" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {following ? t("following") : t("follow")}
        </button>
      )}
      <span className="text-[13px] text-slate-500">{t("followers", { count })}</span>
    </div>
  );
}
