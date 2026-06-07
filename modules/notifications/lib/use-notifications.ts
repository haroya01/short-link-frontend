"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useAuth } from "@/lib/auth";
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationsPage,
} from "@/modules/notifications/api/notifications";

const LIST_KEY = ["notifications", "list"] as const;
const UNREAD_KEY = ["notifications", "unread"] as const;

/** Unread badge — polled so the count stays roughly live without a socket. Gated on sign-in. */
export function useUnreadCount() {
  const { authenticated } = useAuth();
  const { data } = useQuery({
    queryKey: UNREAD_KEY,
    queryFn: getUnreadCount,
    enabled: authenticated,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  return data?.count ?? 0;
}

/** The notification feed, cursor-paginated. Used by both the dropdown (first page) and the page. */
export function useNotifications() {
  const { authenticated } = useAuth();
  return useInfiniteQuery({
    queryKey: LIST_KEY,
    queryFn: ({ pageParam }) => getNotifications(pageParam ?? undefined),
    enabled: authenticated,
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last: NotificationsPage) =>
      last.hasMore ? (last.nextCursor ?? undefined) : undefined,
  });
}

/** Mark one read, then refresh the unread badge. Optimism kept light — invalidate both queries. */
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: UNREAD_KEY });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      qc.setQueryData(UNREAD_KEY, { count: 0 });
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
