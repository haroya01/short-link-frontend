"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth";
import {
  listSubscribedSeriesIds,
  subscribeSeries,
  unsubscribeSeries,
} from "@/modules/blog/api/series-subscription";

/**
 * Shared store of the user's subscribed series ids — mirrors {@link useBookmarks}. The first mounted
 * series card triggers one `listSubscribedSeriesIds()`; every card reads its state from the set and
 * toggling updates it optimistically, so all cards for the same series stay in sync without an N+1.
 */
let subscribed = new Set<number>();
let status: "idle" | "loading" | "ready" = "idle";
const listeners = new Set<() => void>();

function emit() {
  subscribed = new Set(subscribed);
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
    subscribed = new Set(await listSubscribedSeriesIds());
    status = "ready";
    emit();
  } catch {
    status = "idle";
  }
}

/** Reset on sign-out so a different account doesn't inherit the previous user's subscriptions. */
function reset() {
  subscribed = new Set();
  status = "idle";
  for (const l of listeners) l();
}

export function useSeriesSubscriptions() {
  const { authenticated, ready, signInWithGoogle } = useAuth();
  const set = useSyncExternalStore(
    subscribe,
    () => subscribed,
    () => subscribed,
  );

  useEffect(() => {
    if (!ready) return;
    if (authenticated) void ensureLoaded();
    else reset();
  }, [ready, authenticated]);

  const isSubscribed = useCallback((seriesId: number) => set.has(seriesId), [set]);

  const toggle = useCallback(
    async (seriesId: number) => {
      if (!authenticated) {
        signInWithGoogle();
        return;
      }
      const had = subscribed.has(seriesId);
      if (had) subscribed.delete(seriesId);
      else subscribed.add(seriesId);
      emit(); // optimistic
      try {
        if (had) await unsubscribeSeries(seriesId);
        else await subscribeSeries(seriesId);
      } catch {
        if (had) subscribed.add(seriesId);
        else subscribed.delete(seriesId);
        emit(); // rollback
      }
    },
    [authenticated, signInWithGoogle],
  );

  return { isSubscribed, toggle };
}
