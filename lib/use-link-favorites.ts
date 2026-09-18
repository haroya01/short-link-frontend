"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { setFavoriteOrder, setLinkFavorite } from "./api/link-library";
import { loadAccountFavorites } from "./link-favorites-migration";

export function pinFavoritesFirst<T>(
  items: T[],
  favorites: Set<string>,
  keyOf: (item: T) => string,
): T[] {
  if (favorites.size === 0) return items;
  const pinned: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    (favorites.has(keyOf(item)) ? pinned : rest).push(item);
  }
  return pinned.length ? [...pinned, ...rest] : items;
}

/** Account-scoped server library. Local IDs are imported only after ownership validation. */
export function useLinkFavorites() {
  const { me, ready, authenticated } = useAuth();
  const accountId = me?.id;
  const queryClient = useQueryClient();
  const key = useMemo(() => ["links", "favorites", accountId] as const, [accountId]);
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => loadAccountFavorites(accountId!, signal),
    enabled: ready && authenticated && accountId != null,
  });
  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const codes = useMemo(() => new Set(items.map((item) => item.shortCode)), [items]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mutate = useCallback(async (action: () => Promise<void>) => {
    if (lock.current || accountId == null) return;
    lock.current = true;
    setBusy(true);
    try {
      await action();
    } finally {
      await queryClient.invalidateQueries({ queryKey: key });
      lock.current = false;
      setBusy(false);
    }
  }, [accountId, key, queryClient]);
  const toggle = useCallback((code: string) => mutate(() => setLinkFavorite(code, !codes.has(code))), [codes, mutate]);
  const reorder = useCallback((order: string[]) => mutate(() => setFavoriteOrder(order)), [mutate]);
  const isFavorite = useCallback((code: string) => codes.has(code), [codes]);
  return { items, codes, isFavorite, hasAny: codes.size > 0, toggle, reorder, busy, isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}
