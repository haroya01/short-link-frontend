"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { readStorageJson, writeStorageJson } from "@/lib/storage-json";
import {
  followTag,
  getTagPrefs,
  hideTag,
  unfollowTag,
  unhideTag,
  type TagPrefs,
} from "@/modules/blog/api/tag-prefs";

/**
 * Tag preferences — "보고싶은 태그만 모아보기". Followed tags surface as a personal strip; hidden tags'
 * posts are filtered from the feed.
 *
 * Signed-in: synced to the account (`/api/v1/users/me/tag-prefs`) so prefs follow the user across
 * devices. Signed-out: kept device-local in localStorage (no account needed) — the original
 * behaviour, preserved so the feature works before login. Either way a window event carrying the
 * new prefs keeps every mounted consumer (strip, feed, tag page) in step after a toggle.
 */
const KEY = "kurl:blog:tagprefs:v1";
const EVENT = "kurl:tagprefs";

const EMPTY: TagPrefs = { followed: [], hidden: [] };

// useLayoutEffect on the client (seed before paint → no flash), useEffect on the server (no warning).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Module-level so every mounted hook shares one account load instead of each firing its own GET (the
// tag page mounts TagFollowControls + FeedInfinite together), and a remounting feed can seed prefs
// synchronously — before the first paint — instead of flashing hidden-tag posts in and dropping them
// a round-trip later. `accountCache` is null during SSR/hydration (getTagPrefs is client-only and
// never resolves before the first paint), so the first client render still matches the server (empty).
let accountCache: TagPrefs | null = null;
let inflight: Promise<TagPrefs> | null = null;

/** Load the signed-in account's prefs once per session; concurrent/later callers share the result. */
function loadAccountOnce(): Promise<TagPrefs> {
  if (accountCache) return Promise.resolve(accountCache);
  if (!inflight) {
    inflight = getTagPrefs()
      .then((p) => {
        accountCache = p;
        // Mirror to the device store so a cold reload (fresh module) can also seed before paint.
        writeLocal(p);
        return p;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

const isObject = (v: unknown): v is Partial<TagPrefs> => typeof v === "object" && v !== null;

function readLocal(): TagPrefs {
  // Permissive guard + normalize: a partial/legacy shape keeps its valid arrays rather than resetting.
  const p = readStorageJson<Partial<TagPrefs>>(KEY, isObject, EMPTY);
  return {
    followed: Array.isArray(p.followed) ? p.followed : [],
    hidden: Array.isArray(p.hidden) ? p.hidden : [],
  };
}

function writeLocal(next: TagPrefs) {
  writeStorageJson(KEY, next);
}

/** Broadcast the new prefs to every mounted hook instance (this tab + other tabs via storage). */
function broadcast(next: TagPrefs) {
  window.dispatchEvent(new CustomEvent<TagPrefs>(EVENT, { detail: next }));
}

export type { TagPrefs };

export function useTagPrefs() {
  const { ready, authenticated } = useAuth();
  // Seed from the per-session cache when it's warm (a remounting feed then filters hidden tags on the
  // first paint, no flash-then-collapse). The cache is null during SSR/hydration, so the first client
  // paint still matches the server (empty) — no hydration mismatch.
  const [prefs, setPrefs] = useState<TagPrefs>(() => accountCache ?? EMPTY);

  // Cold reload (module just loaded, cache empty): fall back to the device store before paint, so
  // hidden tags apply on the first frame instead of after the auth+prefs round-trips. localStorage is
  // available regardless of auth readiness; the account fetch below refines it for signed-in users.
  useIsoLayoutEffect(() => {
    if (accountCache) return;
    const local = readLocal();
    if (local.followed.length || local.hidden.length) setPrefs(local);
  }, []);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    if (authenticated) {
      loadAccountOnce()
        .then((p) => active && setPrefs(p))
        .catch(() => {});
    } else {
      // Signed out: drop any prior account cache so a later sign-in reloads fresh, and trust the
      // device store as the source of truth.
      accountCache = null;
      setPrefs(readLocal());
    }
    const sync = (e: Event) => setPrefs((e as CustomEvent<TagPrefs>).detail ?? readLocal());
    const syncStorage = () => setPrefs(readLocal());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", syncStorage);
    return () => {
      active = false;
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", syncStorage);
    };
  }, [ready, authenticated]);

  const isFollowed = useCallback((tag: string) => prefs.followed.includes(tag), [prefs]);
  const isHidden = useCallback((tag: string) => prefs.hidden.includes(tag), [prefs]);

  // Optimistically update + broadcast, then persist (account API when signed in, localStorage when
  // not). On API failure roll every layer back to the pre-toggle state (state, broadcast, session cache,
  // device mirror) so the pill can't sit "on" while the server still has it off. Local writes can't fail
  // meaningfully, so the signed-out path just persists. The session cache + device mirror move with the
  // state either way, so a remount seeds the current value.
  const apply = useCallback(
    (next: TagPrefs, remote: () => Promise<TagPrefs>) => {
      const prev: TagPrefs = accountCache ?? readLocal();
      setPrefs(next);
      broadcast(next);
      if (authenticated) accountCache = next;
      writeLocal(next);
      if (authenticated) {
        remote()
          .then((fresh) => {
            accountCache = fresh;
            writeLocal(fresh);
            setPrefs(fresh);
            broadcast(fresh);
          })
          .catch(() => {
            accountCache = prev;
            writeLocal(prev);
            setPrefs(prev);
            broadcast(prev);
          });
      }
    },
    [authenticated],
  );

  const toggleFollow = useCallback(
    (tag: string) => {
      const cur = prefs;
      const isOn = cur.followed.includes(tag);
      const next: TagPrefs = {
        followed: isOn ? cur.followed.filter((t) => t !== tag) : [...cur.followed, tag],
        // Following a tag clears any hide on it (the two are mutually exclusive intents).
        hidden: cur.hidden.filter((t) => t !== tag),
      };
      apply(next, () => (isOn ? unfollowTag(tag) : followTag(tag)));
    },
    [prefs, apply],
  );

  const toggleHide = useCallback(
    (tag: string) => {
      const cur = prefs;
      const isOn = cur.hidden.includes(tag);
      const next: TagPrefs = {
        hidden: isOn ? cur.hidden.filter((t) => t !== tag) : [...cur.hidden, tag],
        followed: cur.followed.filter((t) => t !== tag),
      };
      apply(next, () => (isOn ? unhideTag(tag) : hideTag(tag)));
    },
    [prefs, apply],
  );

  return { prefs, isFollowed, isHidden, toggleFollow, toggleHide };
}
