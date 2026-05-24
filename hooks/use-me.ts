"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { fetchMe, readToken } from "@/lib/api/client";
import type { Me } from "@/types";

export const ME_QUERY_KEY = ["me"] as const;

/**
 * Tracks "is there an access token in storage right now" as reactive state. Listens to the
 * `auth:change` event ({@link setToken} dispatches it on login / logout / refresh) and the
 * cross-tab `storage` event so a sign-out in another tab also flips this here. SSR-safe: reads
 * localStorage only inside `useState`'s initializer (lazy) and the effect.
 */
function useHasToken(): boolean {
  const [hasToken, setHasToken] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!readToken();
  });

  useEffect(() => {
    const update = () => setHasToken(!!readToken());
    // Read once on mount as well — hydration may have started before localStorage was readable.
    update();
    window.addEventListener("auth:change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("auth:change", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return hasToken;
}

/**
 * Subscribe to the current user. Disabled while no access token is in storage so anonymous visits
 * never fire /me. On logout (`setToken(null)` → `auth:change`) the query is removed so stale `me`
 * data is never shown after sign-out.
 */
export function useMe() {
  const hasToken = useHasToken();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (hasToken) return;
    queryClient.removeQueries({ queryKey: ME_QUERY_KEY });
  }, [hasToken, queryClient]);

  return useQuery<Me>({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    enabled: hasToken,
  });
}
