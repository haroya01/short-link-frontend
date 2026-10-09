import { request, requestText } from "@/lib/api/client";
import { authoringMocks } from "@/modules/blog/api/_mock-gates";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

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
  /** Moves on every content save. Absent from a server without edit-conflict checks. */
  contentVersion?: number;
}

/**
 * A content save's conflict check: the server refuses (409 POST_EDIT_CONFLICT) when the post moved
 * past `baseVersion`, unless `overwrite`. Both omitted — an older server — and the save just writes.
 */
export interface EditGuard {
  baseVersion?: number;
  overwrite?: boolean;
}

/** A body with the version it was read or written at — null when the server doesn't send one. */
export interface VersionedBlocks {
  blocks: PostBlockView[];
  contentVersion: number | null;
}

function contentVersionOf(headers: Headers): number | null {
  const raw = headers.get("X-Content-Version");
  const version = raw === null || raw.trim() === "" ? NaN : Number(raw);
  return Number.isInteger(version) && version >= 0 ? version : null;
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
  if (authoringMocks) return Promise.resolve(authoringMocks.mockListMyPosts());
  return request<PostView[]>("/api/v1/posts", { method: "GET" });
}

export function getPost(id: number): Promise<PostView> {
  if (authoringMocks) return Promise.resolve(authoringMocks.mockGetPost(id));
  return request<PostView>(`/api/v1/posts/${id}`, { method: "GET" });
}

export function createPost(payload: {
  slug: string;
  title: string;
  languageTag?: string;
}): Promise<PostView> {
  if (authoringMocks) return Promise.resolve(authoringMocks.mockCreatePost(payload));
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
  } & EditGuard,
): Promise<PostView> {
  if (authoringMocks) return Promise.resolve(authoringMocks.mockUpdatePostMetadata(id, payload));
  return request<PostView>(`/api/v1/posts/${id}`, { method: "PATCH", body: payload });
}

export function deletePost(id: number): Promise<void> {
  if (authoringMocks) {
    authoringMocks.mockDeletePost(id);
    return Promise.resolve();
  }
  return request(`/api/v1/posts/${id}`, { method: "DELETE" });
}

export function publishPost(id: number): Promise<PostView> {
  if (authoringMocks) return Promise.resolve(authoringMocks.mockSetStatus(id, "PUBLISHED"));
  return request<PostView>(`/api/v1/posts/${id}/publish`, { method: "POST" });
}

export function unpublishPost(id: number): Promise<PostView> {
  if (authoringMocks) return Promise.resolve(authoringMocks.mockSetStatus(id, "UNPUBLISHED"));
  return request<PostView>(`/api/v1/posts/${id}/unpublish`, { method: "POST" });
}

/**
 * Get-or-create the share token for a not-yet-public post, so the owner can preview/share it without
 * publishing. Idempotent on the backend — the same post returns the same token, so the link is
 * stable.
 */
export function issuePreviewToken(id: number): Promise<{ token: string }> {
  if (USE_MOCKS) return Promise.resolve({ token: `mock-preview-${id}` });
  return request<{ token: string }>(`/api/v1/posts/${id}/preview-token`, { method: "POST" });
}

export function republishPost(id: number): Promise<PostView> {
  if (authoringMocks) return Promise.resolve(authoringMocks.mockSetStatus(id, "PUBLISHED"));
  return request<PostView>(`/api/v1/posts/${id}/republish`, { method: "POST" });
}

/** Park a draft for future auto-publish. `scheduledAt` is an ISO instant (must be in the future). */
export function schedulePost(id: number, scheduledAt: string): Promise<PostView> {
  if (authoringMocks)
    return Promise.resolve(authoringMocks.mockSetStatus(id, "SCHEDULED", scheduledAt));
  return request<PostView>(`/api/v1/posts/${id}/schedule`, {
    method: "POST",
    body: { scheduledAt },
  });
}

/** Cancel a schedule — send a SCHEDULED post back to DRAFT. */
export function backToDraftPost(id: number): Promise<PostView> {
  if (authoringMocks) return Promise.resolve(authoringMocks.mockSetStatus(id, "DRAFT"));
  return request<PostView>(`/api/v1/posts/${id}/back-to-draft`, { method: "POST" });
}

export interface PostRevisionView {
  id: number;
  versionNumber: number;
  titleSnapshot: string;
  createdAt: string;
}

export function listRevisions(id: number): Promise<PostRevisionView[]> {
  if (authoringMocks) return Promise.resolve(authoringMocks.mockListRevisions(id));
  return request<PostRevisionView[]>(`/api/v1/posts/${id}/revisions`, { method: "GET" });
}

export function restoreRevision(id: number, versionNumber: number): Promise<PostView> {
  if (authoringMocks) return Promise.resolve(authoringMocks.mockGetPost(id));
  return request<PostView>(`/api/v1/posts/${id}/revisions/${versionNumber}/restore`, {
    method: "POST",
  });
}

/** The body with `X-Content-Version`, read in the same transaction — the editor's base version. */
export async function getBlocks(id: number): Promise<VersionedBlocks> {
  if (authoringMocks) return authoringMocks.mockGetBlocks(id);
  const { text, headers } = await requestText(`/api/v1/posts/${id}/blocks`, { method: "GET" });
  return { blocks: JSON.parse(text) as PostBlockView[], contentVersion: contentVersionOf(headers) };
}

export async function replaceBlocks(id: number, blocks: BlockInput[], guard: EditGuard = {}): Promise<VersionedBlocks> {
  if (authoringMocks) return authoringMocks.mockReplaceBlocks(id, blocks, guard);
  const { text, headers } = await requestText(`/api/v1/posts/${id}/blocks`, {
    method: "PUT",
    body: { blocks, ...guard },
  });
  return { blocks: text ? (JSON.parse(text) as PostBlockView[]) : [], contentVersion: contentVersionOf(headers) };
}
