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
  showCount = true,
  compact = false,
}: {
  username: string;
  initialFollowerCount: number;
  /** Show the "N followers" count beside the button. Off in tight spots (e.g. the post header). */
  showCount?: boolean;
  /** Small pill matching the series 구독 button (h-7 · pop on toggle) — for the series rail, where it
   *  sits beside the subscribe button and should read as the same control family. */
  compact?: boolean;
}) {
  const t = useTranslations("publicPost");
  const { authenticated, ready, me, signInWithGoogle } = useAuth();
  const [count, setCount] = useState(initialFollowerCount);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  // Pop only on click (not on mount) — same gate as the subscribe button's keyed-span replay.
  const [interacted, setInteracted] = useState(false);
  // The real follower count + following state arrive from a fetch; until then the count is a
  // placeholder (often 0). Gate the count's visibility on this so it never flashes "0 → 128".
  const [loaded, setLoaded] = useState(false);

  const isSelf = ready && me?.username === username;

  useEffect(() => {
    if (!ready) return;
    getFollowStatus(username)
      .then((s) => {
        setCount(s.followerCount);
        setFollowing(s.following);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
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

  const onColor = following
    ? "border border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
    : "bg-accent-600 text-white hover:bg-accent-700";
  const btnCls = compact
    ? `touch-target inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-3 text-[12px] font-semibold transition-colors duration-200 focus-ring ${
        following ? onColor : `border-transparent ${onColor}`
      }`
    : `touch-target inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors focus-ring ${onColor}`;
  const iconCls = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const icon = following ? <UserCheck className={iconCls} /> : <UserPlus className={iconCls} />;
  const label = following ? t("following") : t("follow");

  return (
    <div className="flex items-center gap-3">
      {!isSelf && (
        <button
          type="button"
          onClick={() => {
            setInteracted(true);
            void toggle();
          }}
          aria-pressed={following}
          className={btnCls}
        >
          {compact ? (
            // Keyed by state so it remounts + replays the pop on each 팔로우 ↔ 팔로잉 toggle.
            <span
              key={following ? "on" : "off"}
              className={`${interacted ? "subscribe-pop" : ""} inline-flex items-center gap-1`}
            >
              {icon}
              {label}
            </span>
          ) : (
            <>
              {icon}
              {label}
            </>
          )}
        </button>
      )}
      {showCount && (
        // Always in the DOM (reserves its width → no layout shift) but invisible until the real count
        // loads, then fades in — so the misleading initial "0" is never seen.
        <span
          className={`text-[13px] text-slate-500 transition-opacity duration-300 dark:text-slate-400 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        >
          {t("followers", { count })}
        </span>
      )}
    </div>
  );
}
