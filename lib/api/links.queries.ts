"use client";

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";

import { getLinkDetail, listMyLinks, listTags, type MyLinksFilters } from "./links";

export const linksKeys = {
  all: ["links"] as const,
  list: (filters: MyLinksFilters) => {
    // Strip the cursor — useInfiniteQuery owns paging, so a stale `after` from the caller's state
    // shouldn't fork the cache into a separate entry per page boundary.
    const { after: _after, ...rest } = filters;
    void _after;
    return ["links", "list", rest] as const;
  },
  detail: (shortCode: string) => ["links", "detail", shortCode] as const,
};

export const tagsKeys = {
  all: ["tags"] as const,
};

export function useMyLinks(filters: MyLinksFilters, options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: linksKeys.list(filters),
    queryFn: ({ pageParam }) => listMyLinks({ ...filters, after: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined,
    enabled: options?.enabled ?? true,
  });
}

export function useTags(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: tagsKeys.all,
    queryFn: listTags,
    enabled: options?.enabled ?? true,
  });
}

export function useLinkDetail(shortCode: string | undefined | null) {
  return useQuery({
    queryKey: shortCode ? linksKeys.detail(shortCode) : ["links", "detail", "__disabled__"],
    queryFn: () => getLinkDetail(shortCode as string),
    enabled: !!shortCode,
  });
}

export function useInvalidateLinks() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: linksKeys.all }),
    [queryClient],
  );
}

export function useInvalidateTags() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: tagsKeys.all }),
    [queryClient],
  );
}
