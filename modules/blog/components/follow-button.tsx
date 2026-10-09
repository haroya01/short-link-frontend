"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Bell, BellRing, Check, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/use-confirm";
import { readStorageJson, writeStorageJson } from "@/lib/storage-json";
import { followUser, setNoteNotifications, unfollowUser } from "@/modules/blog/api/follows";
import { fetchFollowStatus } from "@/modules/blog/lib/follow-status-cache";
import { useFollowShared } from "@/modules/blog/lib/follow-store";
import { useBlockedNames } from "@/modules/blog/lib/user-blocks";
import { emitFollowChanged } from "@/modules/blog/lib/consequence-events";
import { followToggleClass } from "@/modules/blog/lib/follow-toggle";
import { cn } from "@/lib/utils";

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
  showCount = false,
  compact = false,
  quiet = false,
  showBell = false,
  sourcePostId,
}: {
  username: string;
  initialFollowerCount: number;
  /** Show the "N followers" count beside the button. Off in tight spots (e.g. the post header). */
  showCount?: boolean;
  /** Smaller pill (h-7) for tight spots like the series rail; the default (h-9) is the profile action. */
  compact?: boolean;
  /** Green outline instead of the fill — for list rows and spots beside the page's own primary. */
  quiet?: boolean;
  /** Beside 팔로잉, a bell for a notice on every new note (Mastodon's notify). The profile header only. */
  showBell?: boolean;
  /** When followed from inside a post, attributes the follow to it ("이 글로 늘어난 팔로우" analytics). */
  sourcePostId?: number;
}) {
  const t = useTranslations("publicPost");
  const { authenticated, ready, me, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  // following / count / countHidden live in a process-wide store keyed by username, so two buttons for
  // the same author (rail + header on a post) move in lockstep this session. Seeded from the initial
  // follower count; the cache seed + status load below write through it, so all instances share one truth.
  const [shared, setShared] = useFollowShared(username, {
    following: false,
    count: initialFollowerCount,
    countHidden: false,
  });
  const { following, count, countHidden } = shared;
  const [busy, setBusy] = useState(false);
  // Pop only on click (not on mount) — so navigating between tabs doesn't replay it.
  const [interacted, setInteracted] = useState(false);
  // Gates the count's visibility so it never flashes "0 → 128"; seeded true from cache on a revisit.
  const [loaded, setLoaded] = useState(false);
  // Button visibility seeded from cache before auth resolves (null = unknown / cold cache).
  const [seedVisible, setSeedVisible] = useState<boolean | null>(null);
  const [notifyNotes, setNotifyNotes] = useState(false);
  const [bellBusy, setBellBusy] = useState(false);
  const [bellRung, setBellRung] = useState(false);
  // A locked author (Mastodon's locked account) turns a follow into a request that waits on approval.
  const [requested, setRequested] = useState(false);
  const [locked, setLocked] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  // Until auth resolves we don't know if this is the viewer's own profile. Once `ready`, that's
  // authoritative; before then we fall back to the cached self/visitor verdict so the button doesn't
  // re-hide and pop back in on every hard navigation (the flicker) — only the very first visit (cold
  // cache) waits for auth.
  const isSelf = ready && me?.username === username;
  const blocked = useBlockedNames().has(username);
  const showButton = !blocked && (ready ? !isSelf : seedVisible === true);

  // Blocking ends the follow and any pending request on the server; mirror it so an unblock doesn't
  // bring back a stale 팔로잉 from the shared store or the session cache.
  useEffect(() => {
    if (!blocked) return;
    const nextCount = following ? Math.max(count - 1, 0) : count;
    setShared({ following: false, count: nextCount, countHidden });
    setRequested(false);
    setNotifyNotes(false);
    writeFollowCache(username, { following: false, count: nextCount, self: false, hidden: countHidden });
    // Runs on the block itself, not on every follow-state change while blocked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked, username]);

  // Seed from the session cache before paint → no flash on tab navigation. Writes through the shared
  // store so a co-mounted button for the same author seeds identically.
  useIsoLayoutEffect(() => {
    const cached = readFollowCache(username);
    if (cached) {
      // A hidden-count author cached a placeholder count; seed `countHidden` (not the count) so the count
      // text stays dropped on remount rather than flashing "팔로워 0명" until the status refetch.
      if (cached.hidden) {
        setShared({ following: cached.following, count: initialFollowerCount, countHidden: true });
      } else {
        setShared({ following: cached.following, count: cached.count, countHidden: false });
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
        setNotifyNotes(s.notifyNotes ?? false);
        setRequested(s.requested ?? false);
        setLocked(s.locked ?? false);
        // Hidden author: no count key in the response. Keep the button, drop the count text.
        if (s.hideFollowerCount || s.followerCount == null) {
          setShared({ following: s.following, count: initialFollowerCount, countHidden: true });
          writeFollowCache(username, { following: s.following, count: 0, self, hidden: true });
          return;
        }
        setShared({ following: s.following, count: s.followerCount, countHidden: false });
        writeFollowCache(username, { following: s.following, count: s.followerCount, self });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    // setShared is stable (keyed by username); initialFollowerCount is only a hidden-count fallback and
    // must not re-trigger the status load. The real triggers are ready/username/viewer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, username, me?.username]);

  async function toggle() {
    if (!authenticated) {
      signInWithGoogle();
      return;
    }
    if (busy) return;
    if (requested && !(await confirm({ title: t("withdrawRequestTitle"), confirmLabel: t("withdrawRequest"), destructive: true })))
      return;
    setBusy(true);
    const next = !(following || requested);
    const bellBefore = notifyNotes;
    const requestedBefore = requested;
    // Optimistic — write through the shared store so a co-mounted button for this author flips too. A
    // locked author only gets a request, so neither the follow nor the count moves yet.
    if (next && locked) setRequested(true);
    else {
      setShared({ following: next, count: count + (next ? 1 : following ? -1 : 0), countHidden });
      setRequested(false);
    }
    if (!next) setNotifyNotes(false);
    try {
      const s = next ? await followUser(username, sourcePostId) : await unfollowUser(username);
      const nextCount = s.followerCount;
      const hide = s.hideFollowerCount || nextCount == null;
      setShared({ following: s.following, count: nextCount ?? count, countHidden: hide });
      setNotifyNotes(s.notifyNotes ?? false);
      setRequested(s.requested ?? false);
      setLocked(s.locked ?? locked);
      if (s.requested && !requestedBefore) toast(t("followRequestedToast"));
      writeFollowCache(username, {
        following: s.following,
        count: nextCount ?? 0,
        self: me?.username === username,
        hidden: hide,
      });
      // The following feed's contents changed — mark it stale so it re-fetches on the next visit.
      emitFollowChanged();
    } catch (e) {
      setShared({ following, count, countHidden });
      setRequested(requestedBefore);
      setNotifyNotes(bellBefore);
      toast(t(e instanceof ApiError && e.detail.code === "BLOCKED_TARGET" ? "followBlocked" : "followError"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBell() {
    if (bellBusy) return;
    setBellBusy(true);
    setBellRung(true);
    const next = !notifyNotes;
    setNotifyNotes(next);
    try {
      const s = await setNoteNotifications(username, next);
      setNotifyNotes(s.notifyNotes);
      toast(t(s.notifyNotes ? "noteBellOnToast" : "noteBellOffToast"));
    } catch {
      setNotifyNotes(!next);
      toast(t("noteBellError"), "error");
    } finally {
      setBellBusy(false);
    }
  }

  const gapCls = compact ? "gap-1" : "gap-1.5";
  const iconCls = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const icon = following ? (
    <Check aria-hidden className={iconCls} />
  ) : requested ? (
    <Clock aria-hidden className={iconCls} />
  ) : null;
  const label = following ? t("following") : requested ? t("requested") : t("follow");
  const pressed = following || requested;

  return (
    <div className="flex items-center gap-3">
      {showButton && (
        <button
          type="button"
          onClick={() => {
            setInteracted(true);
            void toggle();
          }}
          aria-pressed={pressed}
          data-testid="follow-button"
          // Curation framing, not broadcast: following a curator is following the path they weave, not
          // subscribing to a feed. Kept as the quiet hint so the pill itself stays a single word.
          title={pressed ? undefined : locked ? t("followLockedHint") : t("followCuratorHint")}
          className={followToggleClass(pressed, compact, quiet)}
        >
          {/* Keyed by state so it remounts + replays the pop on each 팔로우 ↔ 팔로잉 toggle. */}
          <span
            key={following ? "on" : requested ? "asked" : "off"}
            className={`${interacted ? "subscribe-pop" : ""} inline-flex items-center ${gapCls}`}
          >
            {icon}
            {label}
          </span>
        </button>
      )}
      {showBell && showButton && following && (
        <button
          type="button"
          onClick={() => void toggleBell()}
          disabled={bellBusy}
          aria-pressed={notifyNotes}
          aria-label={t(notifyNotes ? "noteBellOff" : "noteBellOn")}
          title={t(notifyNotes ? "noteBellOff" : "noteBellOn")}
          className={cn(
            "touch-target focus-ring -ml-1.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
            notifyNotes
              ? "border-accent-600/50 text-accent-700 hover:border-accent-600 dark:border-accent-400/40 dark:text-accent-300 dark:hover:border-accent-400"
              : "border-slate-300 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600",
          )}
        >
          <span
            key={notifyNotes ? "on" : "off"}
            className={`${bellRung || interacted ? "subscribe-pop" : ""} inline-flex`}
          >
            {notifyNotes ? <BellRing aria-hidden className="h-4 w-4" /> : <Bell aria-hidden className="h-4 w-4" />}
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
      {confirmDialog}
    </div>
  );
}
