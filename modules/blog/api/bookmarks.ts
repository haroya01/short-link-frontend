import { request } from "@/lib/api/client";
import { USE_MOCKS } from "@/modules/blog/api/_mocks";

/** One entry in the reading list — mirrors the backend BookmarkView. */
export interface BookmarkItem {
  id: number;
  username: string;
  title: string;
  slug: string;
}

export interface BookmarkStatus {
  bookmarked: boolean;
}

/** Whether the signed-in user has this post bookmarked. */
export function getBookmarkStatus(postId: number): Promise<BookmarkStatus> {
  if (USE_MOCKS) return Promise.resolve({ bookmarked: false });
  return request<BookmarkStatus>(`/api/v1/posts/${postId}/bookmark`, { method: "GET" });
}

export function addBookmark(postId: number): Promise<BookmarkStatus> {
  if (USE_MOCKS) return Promise.resolve({ bookmarked: true });
  return request<BookmarkStatus>(`/api/v1/posts/${postId}/bookmark`, { method: "PUT" });
}

export function removeBookmark(postId: number): Promise<BookmarkStatus> {
  if (USE_MOCKS) return Promise.resolve({ bookmarked: false });
  return request<BookmarkStatus>(`/api/v1/posts/${postId}/bookmark`, { method: "DELETE" });
}

/** The signed-in user's reading list, newest-bookmarked first. */
export function listBookmarks(): Promise<BookmarkItem[]> {
  if (USE_MOCKS) return Promise.resolve([]);
  return request<BookmarkItem[]>(`/api/v1/bookmarks`, { method: "GET" });
}
