"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Keyed by username so every FollowButton for one author (the post page mounts two) flips together. */
export type FollowShared = { following: boolean; count: number; countHidden: boolean; known: boolean };

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

function setFollowShared(username: string, next: FollowShared) {
  const e = entryFor(username, next);
  e.state = next;
  e.listeners.forEach((l) => l());
}

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
