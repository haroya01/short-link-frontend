"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth";
import { addBookmark, listBookmarks, removeBookmark } from "@/modules/blog/api/bookmarks";

/**
 * A single shared bookmark store for the whole feed. Without it, dropping a {@link BookmarkButton} on
 * every card would fire one `GET /bookmark` per card on load (N+1). Instead the first mounted card
 * triggers one `listBookmarks()`; every card reads its saved state from the resulting `username/slug`
 * set and toggling updates the set optimistically (so all cards for the same post stay in sync).
 *
 * Module-level (not React context) so it spans every surface that renders feed cards — feed home, tag,
 * author, following — without threading a provider through each one.
 */
const key = (username: string, slug: string) => `${username}/${slug}`;

let saved = new Set<string>();
let status: "idle" | "loading" | "ready" = "idle";
const listeners = new Set<() => void>();

function emit() {
  // Replace the reference so useSyncExternalStore sees a new snapshot.
  saved = new Set(saved);
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

async function ensureLoaded() {
  if (status !== "idle") return;
  status = "loading";
  try {
    const items = await listBookmarks();
    saved = new Set(items.map((b) => key(b.username, b.slug)));
    status = "ready";
    emit();
  } catch {
    // Leave the set empty and allow a later retry (e.g. after sign-in).
    status = "idle";
  }
}

/** Reset on sign-out so a different account doesn't inherit the previous user's saved set. */
function reset() {
  saved = new Set();
  status = "idle";
  for (const l of listeners) l();
}

export function useBookmarks() {
  const { authenticated, ready, signInWithGoogle } = useAuth();
  const set = useSyncExternalStore(
    subscribe,
    () => saved,
    () => saved,
  );

  useEffect(() => {
    if (!ready) return;
    if (authenticated) void ensureLoaded();
    else reset();
  }, [ready, authenticated]);

  const isSaved = useCallback((username: string, slug: string) => set.has(key(username, slug)), [set]);

  const toggle = useCallback(
    async (postId: number, username: string, slug: string) => {
      if (!authenticated) {
        signInWithGoogle();
        return;
      }
      const k = key(username, slug);
      const had = saved.has(k);
      if (had) saved.delete(k);
      else saved.add(k);
      emit(); // optimistic
      try {
        if (had) await removeBookmark(postId);
        else await addBookmark(postId);
      } catch {
        if (had) saved.add(k);
        else saved.delete(k);
        emit(); // rollback
      }
    },
    [authenticated, signInWithGoogle],
  );

  return { isSaved, toggle };
}
