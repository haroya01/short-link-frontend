"use client";

import { useQuery } from "@tanstack/react-query";

import { getPublicLinkStats, getPublicTotals, getStats } from "./stats";

export const statsKeys = {
  all: ["stats"] as const,
  link: (shortCode: string) => ["stats", "link", shortCode] as const,
  publicLink: (shortCode: string) => ["stats", "public-link", shortCode] as const,
  publicTotals: () => ["stats", "public-totals"] as const,
};

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
