import { request } from "@/lib/api/client";
import { USE_MOCKS } from "@/modules/blog/api/_mocks";
import {
  mockCreatePost,
  mockDeletePost,
  mockGetBlocks,
  mockGetPost,
  mockListMyPosts,
  mockListRevisions,
  mockReplaceBlocks,
  mockSetStatus,
  mockUpdatePostMetadata,
} from "@/modules/blog/api/_mocks-authoring";

export type PostStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "UNPUBLISHED";

export interface PostView {
  id: number;
  slug: string;
  title: string;
  status: PostStatus;
  languageTag: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  excerpt: string | null;
  ogImageUrl: string | null;
  viewCount: number;
  /** Lifetime likes — shown in 내 글 when >0. Backend adds this to /api/v1/posts alongside viewCount;
   *  until then it's absent at runtime and the like count simply doesn't render (showLikes gates on >0). */
  likeCount: number;
  tags: string[];
  seriesId: number | null;
  seriesOrder: number | null;
  /** Author curation: 0-based position among pinned posts (null = not pinned). */
  pinOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlockInput {
  type: string;
  content: string | null;
}

export interface PostBlockView {
  id: number;
  type: string;
  content: string | null;
  blockOrder: number;
}

export function listMyPosts(): Promise<PostView[]> {
  if (USE_MOCKS) return Promise.resolve(mockListMyPosts());
  return request<PostView[]>("/api/v1/posts", { method: "GET" });
}

export function getPost(id: number): Promise<PostView> {
  if (USE_MOCKS) return Promise.resolve(mockGetPost(id));
  return request<PostView>(`/api/v1/posts/${id}`, { method: "GET" });
}

export function createPost(payload: {
  slug: string;
  title: string;
  languageTag?: string;
}): Promise<PostView> {
  if (USE_MOCKS) return Promise.resolve(mockCreatePost(payload));
  return request<PostView>("/api/v1/posts", { method: "POST", body: payload });
}

export function updatePostMetadata(
  id: number,
  payload: {
    title?: string;
    slug?: string;
    excerpt?: string;
    ogImageUrl?: string;
    ogImageKey?: string;
    languageTag?: string;
    tags?: string[];
  },
): Promise<PostView> {
  if (USE_MOCKS) return Promise.resolve(mockUpdatePostMetadata(id, payload));
  return request<PostView>(`/api/v1/posts/${id}`, { method: "PATCH", body: payload });
}

export function deletePost(id: number): Promise<void> {
  if (USE_MOCKS) {
    mockDeletePost(id);
    return Promise.resolve();
  }
  return request(`/api/v1/posts/${id}`, { method: "DELETE" });
}

export function publishPost(id: number): Promise<PostView> {
  if (USE_MOCKS) return Promise.resolve(mockSetStatus(id, "PUBLISHED"));
  return request<PostView>(`/api/v1/posts/${id}/publish`, { method: "POST" });
}

export function unpublishPost(id: number): Promise<PostView> {
  if (USE_MOCKS) return Promise.resolve(mockSetStatus(id, "UNPUBLISHED"));
  return request<PostView>(`/api/v1/posts/${id}/unpublish`, { method: "POST" });
}

export function republishPost(id: number): Promise<PostView> {
  if (USE_MOCKS) return Promise.resolve(mockSetStatus(id, "PUBLISHED"));
  return request<PostView>(`/api/v1/posts/${id}/republish`, { method: "POST" });
}

/** Park a draft for future auto-publish. `scheduledAt` is an ISO instant (must be in the future). */
export function schedulePost(id: number, scheduledAt: string): Promise<PostView> {
  if (USE_MOCKS) return Promise.resolve(mockSetStatus(id, "SCHEDULED", scheduledAt));
  return request<PostView>(`/api/v1/posts/${id}/schedule`, {
    method: "POST",
    body: { scheduledAt },
  });
}

/** Cancel a schedule — send a SCHEDULED post back to DRAFT. */
export function backToDraftPost(id: number): Promise<PostView> {
  if (USE_MOCKS) return Promise.resolve(mockSetStatus(id, "DRAFT"));
  return request<PostView>(`/api/v1/posts/${id}/back-to-draft`, { method: "POST" });
}

export interface PostRevisionView {
  id: number;
  versionNumber: number;
  titleSnapshot: string;
  createdAt: string;
}

export function listRevisions(id: number): Promise<PostRevisionView[]> {
  if (USE_MOCKS) return Promise.resolve(mockListRevisions(id));
  return request<PostRevisionView[]>(`/api/v1/posts/${id}/revisions`, { method: "GET" });
}

export function restoreRevision(id: number, versionNumber: number): Promise<PostView> {
  if (USE_MOCKS) return Promise.resolve(mockGetPost(id));
  return request<PostView>(`/api/v1/posts/${id}/revisions/${versionNumber}/restore`, {
    method: "POST",
  });
}

export function getBlocks(id: number): Promise<PostBlockView[]> {
  if (USE_MOCKS) return Promise.resolve(mockGetBlocks(id));
  return request<PostBlockView[]>(`/api/v1/posts/${id}/blocks`, { method: "GET" });
}

export function replaceBlocks(id: number, blocks: BlockInput[]): Promise<PostBlockView[]> {
  if (USE_MOCKS) return Promise.resolve(mockReplaceBlocks(id, blocks));
  return request<PostBlockView[]>(`/api/v1/posts/${id}/blocks`, {
    method: "PUT",
    body: { blocks },
  });
}
