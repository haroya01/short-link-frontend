import { request } from "@/lib/api/client";

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
  tags: string[];
  seriesId: number | null;
  seriesOrder: number | null;
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
  return request<PostView[]>("/api/v1/posts", { method: "GET" });
}

export function getPost(id: number): Promise<PostView> {
  return request<PostView>(`/api/v1/posts/${id}`, { method: "GET" });
}

export function createPost(payload: {
  slug: string;
  title: string;
  languageTag?: string;
}): Promise<PostView> {
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
  return request<PostView>(`/api/v1/posts/${id}`, { method: "PATCH", body: payload });
}

export function deletePost(id: number): Promise<void> {
  return request(`/api/v1/posts/${id}`, { method: "DELETE" });
}

export function publishPost(id: number): Promise<PostView> {
  return request<PostView>(`/api/v1/posts/${id}/publish`, { method: "POST" });
}

export function unpublishPost(id: number): Promise<PostView> {
  return request<PostView>(`/api/v1/posts/${id}/unpublish`, { method: "POST" });
}

export function republishPost(id: number): Promise<PostView> {
  return request<PostView>(`/api/v1/posts/${id}/republish`, { method: "POST" });
}

export function getBlocks(id: number): Promise<PostBlockView[]> {
  return request<PostBlockView[]>(`/api/v1/posts/${id}/blocks`, { method: "GET" });
}

export function replaceBlocks(id: number, blocks: BlockInput[]): Promise<PostBlockView[]> {
  return request<PostBlockView[]>(`/api/v1/posts/${id}/blocks`, {
    method: "PUT",
    body: { blocks },
  });
}
