"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { readStorageJson, writeStorageJson } from "@/lib/storage-json";
import { followUser, getFollowStatus, unfollowUser } from "@/modules/blog/api/follows";

// useLayoutEffect on the client (seed before paint → no flash), useEffect on the server (no warning).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Per-session cache of follow state, keyed by author. The author tabs hard-navigate (subdomain model),
// so the button remounts on every 글/시리즈/소개 switch and would otherwise reset to "팔로우" + fade the
// count back in each time — the flicker. We seed from the last known value before paint, then refresh.
type FollowSnap = { following: boolean; count: number };
const cacheKey = (u: string) => `kurl:follow:${u}`;
const isSnap = (v: unknown): v is FollowSnap | null =>
  v === null ||
  (typeof v === "object" &&
    v !== null &&
    typeof (v as FollowSnap).following === "boolean" &&
    typeof (v as FollowSnap).count === "number");
function readFollowCache(u: string): FollowSnap | null {
  return readStorageJson<FollowSnap | null>(cacheKey(u), isSnap, null, { session: true });
}
function writeFollowCache(u: string, snap: FollowSnap) {
  writeStorageJson(cacheKey(u), snap, { session: true });
}

/**
 * Follow / unfollow an author + their follower count. The count is public; the following state loads
 * for signed-in viewers. Anonymous click starts the login flow. Hidden on your own profile. Optimistic
 * with rollback on error.
 *
 * Shares the exact button recipe with the series 구독 button (SeriesSubscribeButton): a fixed height +
 * a border in *both* states (transparent when filled) so 팔로우 ↔ 팔로잉 never changes the box size, only
 * the label width; `transition-colors` crossfades the fill/outline swap; and a keyed span replays the
 * `subscribe-pop` on each toggle. So follow and subscribe read as one control family.
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
  /** Smaller pill (h-7) for tight spots like the series rail; the default (h-9) is the profile action. */
  compact?: boolean;
}) {
  const t = useTranslations("publicPost");
  const { authenticated, ready, me, signInWithGoogle } = useAuth();
  const [count, setCount] = useState(initialFollowerCount);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  // Pop only on click (not on mount) — so navigating between tabs doesn't replay it.
  const [interacted, setInteracted] = useState(false);
  // Gates the count's visibility so it never flashes "0 → 128"; seeded true from cache on a revisit.
  const [loaded, setLoaded] = useState(false);

  // Until auth resolves we don't know if this is the viewer's own profile, so we can't tell whether to
  // show the button. Render it only once `ready` — otherwise it flashes in for everyone and then yanks
  // itself away on your own profile (the "버튼이 사라지는" flicker). `showButton` gates on that.
  const isSelf = ready && me?.username === username;
  const showButton = ready && !isSelf;

  // Seed from the session cache before paint → no flash on tab navigation.
  useIsoLayoutEffect(() => {
    const cached = readFollowCache(username);
    if (cached) {
      setFollowing(cached.following);
      setCount(cached.count);
      setLoaded(true);
    }
  }, [username]);

  useEffect(() => {
    if (!ready) return;
    getFollowStatus(username)
      .then((s) => {
        setCount(s.followerCount);
        setFollowing(s.following);
        writeFollowCache(username, { following: s.following, count: s.followerCount });
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
      writeFollowCache(username, { following: s.following, count: s.followerCount });
    } catch {
      setFollowing(!next);
      setCount((c) => c + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  }

  const stateCls = following
    ? "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
    : "border-transparent bg-accent-600 text-white hover:bg-accent-700";
  const sizeCls = compact ? "h-7 px-3 text-[12px]" : "h-9 px-4 text-[14px]";
  const gapCls = compact ? "gap-1" : "gap-1.5";
  const iconCls = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const icon = following ? <UserCheck className={iconCls} /> : <UserPlus className={iconCls} />;
  const label = following ? t("following") : t("follow");

  return (
    <div className="flex items-center gap-3">
      {showButton && (
        <button
          type="button"
          onClick={() => {
            setInteracted(true);
            void toggle();
          }}
          aria-pressed={following}
          className={`touch-target inline-flex shrink-0 items-center rounded-full border font-semibold transition-colors duration-200 focus-ring ${sizeCls} ${stateCls}`}
        >
          {/* Keyed by state so it remounts + replays the pop on each 팔로우 ↔ 팔로잉 toggle. */}
          <span
            key={following ? "on" : "off"}
            className={`${interacted ? "subscribe-pop" : ""} inline-flex items-center ${gapCls}`}
          >
            {icon}
            {label}
          </span>
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
