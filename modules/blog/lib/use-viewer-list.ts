"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

/** The signed-in reader's id once auth settles, null for a visitor, undefined while unknown. */
export function useViewerId(): number | null | undefined {
  const { ready, me } = useAuth();
  return ready ? (me?.id ?? null) : undefined;
}

/**
 * A discovery list the server rendered anonymously, swapped for the signed-in reader's own once we
 * know who is reading (fetchPublic sends their token from the browser). `load` resolves null when the
 * fetch failed, which keeps the server list. `key` names the list, so a new key refetches.
 */
export function useViewerList<T>(initial: T, load: () => Promise<T | null>, key = ""): T {
  const viewer = useViewerId();
  const [fetched, setFetched] = useState<{ viewer: number; key: string; data: T } | null>(null);

  useEffect(() => {
    if (viewer == null) return;
    let live = true;
    load()
      .then((data) => {
        if (live && data !== null) setFetched({ viewer, key, data });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
    // load is a fresh closure every render; the viewer and the key identify what it loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, key]);

  return fetched && fetched.viewer === viewer && fetched.key === key ? fetched.data : initial;
}
