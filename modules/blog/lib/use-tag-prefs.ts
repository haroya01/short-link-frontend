"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Per-device tag preferences — "보고싶은 태그만 모아보기". Followed tags surface as a personal strip;
 * hidden tags' posts are filtered out of the feed. localStorage-only (no account needed); a later
 * backend can sync these. A window event keeps every mounted consumer (strip, feed, tag page) in
 * step after a toggle, the same pattern auth/cookie-consent use.
 */
const KEY = "kurl:blog:tagprefs:v1";
const EVENT = "kurl:tagprefs";

export interface TagPrefs {
  followed: string[];
  hidden: string[];
}

const EMPTY: TagPrefs = { followed: [], hidden: [] };

function read(): TagPrefs {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<TagPrefs>;
    return {
      followed: Array.isArray(p.followed) ? p.followed : [],
      hidden: Array.isArray(p.hidden) ? p.hidden : [],
    };
  } catch {
    return EMPTY;
  }
}

function write(next: TagPrefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / privacy mode */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useTagPrefs() {
  // Start empty so SSR and first client paint agree (avoids hydration mismatch); the effect fills
  // from localStorage right after mount.
  const [prefs, setPrefs] = useState<TagPrefs>(EMPTY);

  useEffect(() => {
    const sync = () => setPrefs(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync); // other tabs
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isFollowed = useCallback((tag: string) => prefs.followed.includes(tag), [prefs]);
  const isHidden = useCallback((tag: string) => prefs.hidden.includes(tag), [prefs]);

  const toggleFollow = useCallback((tag: string) => {
    const cur = read();
    const followed = cur.followed.includes(tag)
      ? cur.followed.filter((t) => t !== tag)
      : [...cur.followed, tag];
    // Following a tag clears any hide on it (the two are mutually exclusive intents).
    const hidden = cur.hidden.filter((t) => t !== tag);
    write({ followed, hidden });
  }, []);

  const toggleHide = useCallback((tag: string) => {
    const cur = read();
    const hidden = cur.hidden.includes(tag)
      ? cur.hidden.filter((t) => t !== tag)
      : [...cur.hidden, tag];
    const followed = cur.followed.filter((t) => t !== tag);
    write({ followed, hidden });
  }, []);

  return { prefs, isFollowed, isHidden, toggleFollow, toggleHide };
}
