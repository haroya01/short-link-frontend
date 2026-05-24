"use client";

import { useQuery } from "@tanstack/react-query";

import { getPublicLinkStats, getPublicTotals, getStats } from "./stats";

/**
 * Hierarchical query-key namespace for stats reads. Following tkdodo's pattern so a partial key
 * (e.g. `['stats']`) can invalidate every stats query in one call when a backend write demands it.
 */
export const statsKeys = {
  all: ["stats"] as const,
  link: (shortCode: string) => ["stats", "link", shortCode] as const,
  publicLink: (shortCode: string) => ["stats", "public-link", shortCode] as const,
  publicTotals: () => ["stats", "public-totals"] as const,
};

/**
 * Owner-side per-link stats. Caller controls activation via `enabled` — typical use is
 * `enabled: ready && authenticated && !!shortCode` so anonymous visits don't fire /me-gated
 * endpoints. SSE-driven refresh (live click feed) calls the returned `refetch()` so the existing
 * cadence (only refetch on signal, not on a timer) is preserved.
 */
export function useLinkStats(shortCode: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: statsKeys.link(shortCode),
    queryFn: () => getStats(shortCode),
    enabled: options?.enabled ?? true,
  });
}

export function usePublicLinkStats(shortCode: string) {
  return useQuery({
    queryKey: statsKeys.publicLink(shortCode),
    queryFn: () => getPublicLinkStats(shortCode),
    enabled: !!shortCode,
  });
}

export function usePublicTotals() {
  return useQuery({
    queryKey: statsKeys.publicTotals(),
    queryFn: getPublicTotals,
  });
}
