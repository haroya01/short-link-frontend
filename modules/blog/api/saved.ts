/**
 * "내 보관함" — the signed-in viewer's own liked + bookmarked posts, shown privately on their own
 * author profile (only when me === profile owner). Bookmarks support user folders ("스마트 셸프": auto
 * tag grouping for unfiled items + manual folders). Folders are a NEW capability the flat bookmarks
 * API doesn't have yet, so in mock this is an in-memory store; against a real backend these map to
 * /api/v1/me/{liked,saved} + /api/v1/bookmarks/folders (backend work — owner's domain).
 */
import { mockFailure, request } from "@/lib/api/client";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";
import { savedMocks } from "@/modules/blog/api/_mock-gates";

export interface BookmarkFolder {
  id: number;
  name: string;
  count: number;
}

/** A bookmarked post + which folder it's filed under (null = unfiled → auto-grouped by tag). */
export type SavedPost = PublicFeedItem & { folderId: number | null };

export function listLikedFeed(): Promise<PublicFeedItem[]> {
  if (savedMocks) return Promise.resolve(savedMocks.mockListLikedFeed());
  return request<PublicFeedItem[]>("/api/v1/users/me/likes", { method: "GET" });
}

export function listSavedFeed(): Promise<SavedPost[]> {
  if (savedMocks) return mockFailure("saved") ?? Promise.resolve(savedMocks.mockListSavedFeed());
  return request<SavedPost[]>("/api/v1/me/saved", { method: "GET" });
}

export function listFolders(): Promise<BookmarkFolder[]> {
  if (savedMocks) return Promise.resolve(savedMocks.mockListFolders());
  return request<BookmarkFolder[]>("/api/v1/bookmarks/folders", { method: "GET" });
}

export function createFolder(name: string): Promise<BookmarkFolder> {
  if (savedMocks) return Promise.resolve(savedMocks.mockCreateFolder(name));
  return request<BookmarkFolder>("/api/v1/bookmarks/folders", { method: "POST", body: { name } });
}

export function renameFolder(id: number, name: string): Promise<BookmarkFolder> {
  if (savedMocks) return Promise.resolve(savedMocks.mockRenameFolder(id, name));
  return request<BookmarkFolder>(`/api/v1/bookmarks/folders/${id}`, { method: "PATCH", body: { name } });
}

export function deleteFolder(id: number): Promise<void> {
  if (savedMocks) {
    savedMocks.mockDeleteFolder(id);
    return Promise.resolve();
  }
  return request(`/api/v1/bookmarks/folders/${id}`, { method: "DELETE" });
}

export function moveSavedToFolder(postId: number, folderId: number | null): Promise<void> {
  if (savedMocks) {
    savedMocks.mockMoveToFolder(postId, folderId);
    return Promise.resolve();
  }
  return request(`/api/v1/me/saved/${postId}/folder`, { method: "PUT", body: { folderId } });
}

export function removeSaved(postId: number): Promise<void> {
  if (savedMocks) {
    savedMocks.mockRemoveSaved(postId);
    return Promise.resolve();
  }
  return request(`/api/v1/posts/${postId}/bookmark`, { method: "DELETE" });
}
