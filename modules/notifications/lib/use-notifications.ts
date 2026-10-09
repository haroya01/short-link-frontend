"use client";

import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useAuth } from "@/lib/auth";
import type { NoteFilter } from "@/modules/notes/api/notes";
import { noticeHidden } from "@/modules/notes/lib/note-filter-match";
import { ApiError } from "@/lib/api/client";
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
  type NotificationsPage,
} from "@/modules/notifications/api/notifications";
import {
  answerFilteredSender,
  listFilteredSenders,
  type FilteredSender,
} from "@/modules/notifications/api/notification-policy";
import {
  answerFollowRequest,
  listFollowRequests,
  type FollowRequest,
} from "@/modules/notifications/api/follow-requests";

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

/** The server stores what a hiding filter catches as read; notices from before the filter are read
 *  here once a list finds them hidden, so the badge never counts a row no list shows. */
export function useReadHiddenNotices(
  items: NotificationItem[],
  filters: NoteFilter[],
  meId: number | null | undefined,
) {
  const qc = useQueryClient();
  const sent = useRef(new Set<number>());
  useEffect(() => {
    const ids = items
      .filter((item) => !item.read && !sent.current.has(item.id) && noticeHidden(item, filters, meId))
      .map((item) => item.id);
    if (ids.length === 0) return;
    ids.forEach((id) => sent.current.add(id));
    void Promise.allSettled(ids.map((id) => markNotificationRead(id))).then(() =>
      qc.invalidateQueries({ queryKey: UNREAD_KEY }),
    );
  }, [items, filters, meId, qc]);
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

const FOLLOW_REQUESTS_KEY = ["notifications", "followRequests"] as const;

/** Who waits on the viewer's approval — the notices' head row and the requests page share it. */
export function useFollowRequests() {
  const { authenticated } = useAuth();
  return useQuery({
    queryKey: FOLLOW_REQUESTS_KEY,
    queryFn: listFollowRequests,
    enabled: authenticated,
  });
}

/** Approve or turn down one request. It leaves the list (and its notice leaves the feed) at once;
 *  a request already settled elsewhere (404) counts as done. */
export function useAnswerFollowRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ origin, approve }: { origin: FollowRequest["origin"]; approve: boolean }) => {
      try {
        await answerFollowRequest(origin, approve);
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 404)) throw e;
      }
    },
    onMutate: async ({ origin }) => {
      await qc.cancelQueries({ queryKey: FOLLOW_REQUESTS_KEY });
      const before = qc.getQueryData<FollowRequest[]>(FOLLOW_REQUESTS_KEY);
      qc.setQueryData<FollowRequest[]>(FOLLOW_REQUESTS_KEY, (list) =>
        list?.filter((r) => JSON.stringify(r.origin) !== JSON.stringify(origin)),
      );
      qc.setQueryData<InfiniteData<NotificationsPage>>(LIST_KEY, (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                items: page.items.filter((item) => !(item.type === "FOLLOW_REQUEST" && answers(item, origin))),
              })),
            }
          : data,
      );
      return { before };
    },
    onError: (_e, _v, context) => {
      if (context?.before) qc.setQueryData(FOLLOW_REQUESTS_KEY, context.before);
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: UNREAD_KEY });
    },
  });
}

function answers(item: NotificationItem, origin: FollowRequest["origin"]): boolean {
  return "member" in origin ? item.actorUsername === origin.member : item.actorRemoteId === origin.remoteId;
}

/** The request a FOLLOW_REQUEST notice is about. */
export function requestOrigin(item: NotificationItem): FollowRequest["origin"] | null {
  if (item.actorRemoteId != null) return { remoteId: item.actorRemoteId };
  if (item.actorUsername) return { member: item.actorUsername };
  return null;
}

const FILTERED_KEY = ["notifications", "filtered"] as const;

/** Senders whose notices the policy kept aside — the feed's head row and the filtered page share it. */
export function useFilteredSenders() {
  const { authenticated } = useAuth();
  return useQuery({ queryKey: FILTERED_KEY, queryFn: listFilteredSenders, enabled: authenticated });
}

/** Accepting brings that sender's notices into the feed, so the feed is read again. */
export function useAnswerFilteredSender() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sender, accept }: { sender: FilteredSender; accept: boolean }) => answerFilteredSender(sender, accept),
    onMutate: async ({ sender }) => {
      await qc.cancelQueries({ queryKey: FILTERED_KEY });
      const before = qc.getQueryData<FilteredSender[]>(FILTERED_KEY);
      qc.setQueryData<FilteredSender[]>(FILTERED_KEY, (list) =>
        list?.filter((s) => !(s.actorUserId === sender.actorUserId && s.actorRemoteId === sender.actorRemoteId)),
      );
      return { before };
    },
    onError: (_e, _v, context) => {
      if (context?.before) qc.setQueryData(FILTERED_KEY, context.before);
    },
    onSuccess: (_d, { accept }) => {
      if (accept) {
        qc.invalidateQueries({ queryKey: LIST_KEY });
        qc.invalidateQueries({ queryKey: UNREAD_KEY });
      }
    },
  });
}
