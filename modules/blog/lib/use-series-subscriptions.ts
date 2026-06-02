"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/auth";
import {
  listSubscribedSeriesIds,
  subscribeSeries,
  unsubscribeSeries,
} from "@/modules/blog/api/series-subscription";
import { createSharedSetStore, useSetStore } from "@/modules/blog/lib/shared-set-store";

/**
 * Shared store of the user's subscribed series ids — mirrors {@link useBookmarks}. The first mounted
 * series card triggers one `listSubscribedSeriesIds()`; every card reads its state from the set and
 * toggling updates it optimistically, so all cards for the same series stay in sync without an N+1.
 */
const store = createSharedSetStore<number>(() => listSubscribedSeriesIds());

export function useSeriesSubscriptions() {
  const { authenticated, ready, signInWithGoogle } = useAuth();
  const set = useSetStore(store, { ready, authenticated });

  const isSubscribed = useCallback((seriesId: number) => set.has(seriesId), [set]);

  const toggle = useCallback(
    async (seriesId: number) => {
      if (!authenticated) {
        signInWithGoogle();
        return;
      }
      await store.optimisticToggle(seriesId, (had) =>
        had ? unsubscribeSeries(seriesId) : subscribeSeries(seriesId),
      );
    },
    [authenticated, signInWithGoogle],
  );

  return { isSubscribed, toggle };
}
