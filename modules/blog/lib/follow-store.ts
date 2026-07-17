"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Process-wide live follow state keyed by author username, so every FollowButton for the SAME author
 * stays in lockstep within a session — the post detail page mounts two (a rail copy + a header copy),
 * and following on one must flip the other with no reload. The like/bookmark buttons already do this
 * via useOptimisticToggle's syncKey store; the follow button keeps its own implementation (anonymous
 * load, count fade-in, self-hide, compact variant — see the note in use-optimistic-toggle) but borrows
 * the same lockstep mechanism here.
 *
 * This holds only the shared per-author facts (following / count / countHidden). Each button keeps its
 * own presentational state (seedVisible, loaded, interacted-pop) — those are per-instance, not shared.
 */
export type FollowShared = { following: boolean; count: number; countHidden: boolean };

type Entry = { state: FollowShared; listeners: Set<() => void> };
const stores = new Map<string, Entry>();

function entryFor(username: string, init: FollowShared): Entry {
  let e = stores.get(username);
  if (!e) {
    e = { state: init, listeners: new Set() };
    stores.set(username, e);
  }
  return e;
}

/** Push new shared state for an author and notify every mounted button for them. */
export function setFollowShared(username: string, next: FollowShared) {
  const e = entryFor(username, next);
  e.state = next;
  e.listeners.forEach((l) => l());
}

/** Subscribe a component to an author's shared follow state. Returns the live value + a setter that
 *  fans out to every other instance. `init` seeds the entry the first time it's read this session. */
export function useFollowShared(username: string, init: FollowShared) {
  const subscribe = useCallback(
    (cb: () => void) => {
      const e = entryFor(username, init);
      e.listeners.add(cb);
      return () => {
        e.listeners.delete(cb);
        if (e.listeners.size === 0) stores.delete(username);
      };
    },
    // init is only used to seed the entry the first time; username is the real key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [username],
  );
  const state = useSyncExternalStore(
    subscribe,
    () => entryFor(username, init).state,
    () => init,
  );
  const set = useCallback((next: FollowShared) => setFollowShared(username, next), [username]);
  return [state, set] as const;
}
