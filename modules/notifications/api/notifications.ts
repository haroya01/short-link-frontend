import { request } from "@/lib/api/client";
import { USE_MOCKS, mockNotificationsPage, mockUnreadCount } from "./_mocks";

export type NotificationType =
  | "LIKE"
  | "COMMENT"
  | "FOLLOW"
  | "SERIES_SUBSCRIBE"
  | "REPLY"
  | "NEW_POST";

/**
 * One in-app notification, as returned by the backend. The actor's display fields are flat and null
 * when the actor was deleted (the UI falls back to an anonymous label). Post fields are set for
 * LIKE/COMMENT/REPLY/NEW_POST (null otherwise); `postAuthorUsername` is set only when the recipient
 * isn't the post's author (REPLY / NEW_POST), so the post link resolves. Series fields are set only
 * for SERIES_SUBSCRIBE. References are point-in-time snapshots, so titles survive a later edit.
 */
export interface NotificationItem {
  id: number;
  type: NotificationType;
  actorId: number | null;
  actorUsername: string | null;
  actorAvatarUrl: string | null;
  postId: number | null;
  postSlug: string | null;
  postTitle: string | null;
  postAuthorUsername: string | null;
  seriesId: number | null;
  seriesSlug: string | null;
  seriesTitle: string | null;
  read: boolean;
  createdAt: string;
}

/** A newest-first page; `nextCursor` feeds the next request's `before`, null when `hasMore` is false. */
export interface NotificationsPage {
  items: NotificationItem[];
  nextCursor: number | null;
  hasMore: boolean;
}

export function getNotifications(before?: number, limit = 20): Promise<NotificationsPage> {
  if (USE_MOCKS) return Promise.resolve(mockNotificationsPage());
  const q = new URLSearchParams();
  if (before != null) q.set("before", String(before));
  q.set("limit", String(limit));
  return request<NotificationsPage>(`/api/v1/notifications?${q.toString()}`, { method: "GET" });
}

export function getUnreadCount(): Promise<{ count: number }> {
  if (USE_MOCKS) return Promise.resolve(mockUnreadCount());
  return request<{ count: number }>(`/api/v1/notifications/unread-count`, { method: "GET" });
}

export function markNotificationRead(id: number): Promise<void> {
  if (USE_MOCKS) return Promise.resolve();
  return request<void>(`/api/v1/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead(): Promise<{ count: number }> {
  if (USE_MOCKS) return Promise.resolve({ count: 0 });
  return request<{ count: number }>(`/api/v1/notifications/read-all`, { method: "POST" });
}
