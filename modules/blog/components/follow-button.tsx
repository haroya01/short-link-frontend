"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { readStorageJson, writeStorageJson } from "@/lib/storage-json";
import { followUser, unfollowUser } from "@/modules/blog/api/follows";
import { fetchFollowStatus } from "@/modules/blog/lib/follow-status-cache";

// useLayoutEffect on the client (seed before paint → no flash), useEffect on the server (no warning).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Per-session cache of follow state, keyed by author. The author tabs hard-navigate (subdomain model),
// so the button remounts on every 글/시리즈/소개 switch and would otherwise reset to "팔로우" + fade the
// count back in each time — the flicker. We seed from the last known value before paint, then refresh.
// `self` lets a revisit seed the button's VISIBILITY before auth resolves — without it the button
// re-hides until `ready` flips on every hard navigation, popping in (and reflowing the 프로필 link
// beside it) each tab switch. Optional so caches written by the older shape still validate.
// `hidden` remembers that the author hides their follower count, so a revisit seeds `countHidden` and
// never flashes the placeholder "0" the cache carries — without it a hard-nav remount reads the seeded
// count at full opacity before the status refetch re-drops it. Optional so older-shape caches validate.
type FollowSnap = { following: boolean; count: number; self?: boolean; hidden?: boolean };
const cacheKey = (u: string) => `kurl:follow:${u}`;
const isSnap = (v: unknown): v is FollowSnap | null =>
  v === null ||
  (typeof v === "object" &&
    v !== null &&
    typeof (v as FollowSnap).following === "boolean" &&
    typeof (v as FollowSnap).count === "number" &&
    (typeof (v as FollowSnap).self === "boolean" || (v as FollowSnap).self === undefined) &&
    (typeof (v as FollowSnap).hidden === "boolean" || (v as FollowSnap).hidden === undefined));
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
  sourcePostId,
}: {
  username: string;
  initialFollowerCount: number;
  /** Show the "N followers" count beside the button. Off in tight spots (e.g. the post header). */
  showCount?: boolean;
  /** Smaller pill (h-7) for tight spots like the series rail; the default (h-9) is the profile action. */
  compact?: boolean;
  /** When followed from inside a post, attributes the follow to it ("이 글로 늘어난 팔로우" analytics). */
  sourcePostId?: number;
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
  // True once the status confirms the author hides their counts — the count text is dropped, the
  // button stays. Starts false so a hidden author never flashes the seeded "0" before status loads.
  const [countHidden, setCountHidden] = useState(false);
  // Button visibility seeded from cache before auth resolves (null = unknown / cold cache).
  const [seedVisible, setSeedVisible] = useState<boolean | null>(null);

  // Until auth resolves we don't know if this is the viewer's own profile. Once `ready`, that's
  // authoritative; before then we fall back to the cached self/visitor verdict so the button doesn't
  // re-hide and pop back in on every hard navigation (the flicker) — only the very first visit (cold
  // cache) waits for auth.
  const isSelf = ready && me?.username === username;
  const showButton = ready ? !isSelf : seedVisible === true;

  // Seed from the session cache before paint → no flash on tab navigation.
  useIsoLayoutEffect(() => {
    const cached = readFollowCache(username);
    if (cached) {
      setFollowing(cached.following);
      // A hidden-count author cached a placeholder count; seed `countHidden` (not the count) so the count
      // text stays dropped on remount rather than flashing "팔로워 0명" until the status refetch.
      if (cached.hidden) {
        setCountHidden(true);
      } else {
        setCount(cached.count);
        setLoaded(true);
      }
      if (typeof cached.self === "boolean") setSeedVisible(!cached.self);
    }
  }, [username]);

  useEffect(() => {
    if (!ready) return;
    const self = me?.username === username;
    fetchFollowStatus(username)
      .then((s) => {
        setFollowing(s.following);
        // Hidden author: no count key in the response. Keep the button, drop the count text.
        if (s.hideFollowerCount || s.followerCount == null) {
          setCountHidden(true);
          writeFollowCache(username, { following: s.following, count: 0, self, hidden: true });
          return;
        }
        setCountHidden(false);
        setCount(s.followerCount);
        writeFollowCache(username, { following: s.following, count: s.followerCount, self });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [ready, username, me?.username]);

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
      const s = next ? await followUser(username, sourcePostId) : await unfollowUser(username);
      setFollowing(s.following);
      const nextCount = s.followerCount;
      const hide = s.hideFollowerCount || nextCount == null;
      setCountHidden(hide);
      if (nextCount != null) setCount(nextCount);
      writeFollowCache(username, {
        following: s.following,
        count: nextCount ?? 0,
        self: me?.username === username,
        hidden: hide,
      });
    } catch {
      setFollowing(!next);
      setCount((c) => c + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  }

  const stateCls = following
    ? "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
    : "border-transparent bg-accent-700 text-white hover:bg-accent-800";
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
          // Curation framing, not broadcast: following a curator is following the path they weave, not
          // subscribing to a feed. Kept as the quiet hint so the pill itself stays a single word.
          aria-label={following ? undefined : t("followCuratorHint")}
          title={following ? undefined : t("followCuratorHint")}
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
      {showCount && !countHidden && (
        // Always in the DOM (reserves its width → no layout shift) but invisible until the real count
        // loads, then fades in — so the misleading initial "0" is never seen. Dropped entirely for an
        // author who hides their counts (countHidden), leaving just the follow button.
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
