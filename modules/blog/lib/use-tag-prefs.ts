"use client";

import { useCallback, useEffect, useState } from "react";
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
  // Start empty so SSR and first client paint agree (avoids hydration mismatch); the effect fills
  // from the account (signed-in) or localStorage (signed-out) after mount.
  const [prefs, setPrefs] = useState<TagPrefs>(EMPTY);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    if (authenticated) {
      getTagPrefs()
        .then((p) => active && setPrefs(p))
        .catch(() => {});
    } else {
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
  // not). On API failure the next event/refetch corrects it; local writes can't fail meaningfully.
  const apply = useCallback(
    (next: TagPrefs, remote: () => Promise<TagPrefs>) => {
      setPrefs(next);
      broadcast(next);
      if (authenticated) {
        remote()
          .then((fresh) => {
            setPrefs(fresh);
            broadcast(fresh);
          })
          .catch(() => {});
      } else {
        writeLocal(next);
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
