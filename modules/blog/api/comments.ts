import { request } from "@/lib/api/client";
import type { PublicAuthor } from "./public-posts";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export interface CommentView {
  id: number;
  parentId: number | null;
  author: PublicAuthor | null;
  body: string;
  createdAt: string;
}

/** Public — anyone can read a post's comments (oldest first, flat with parentId). */
export async function listComments(postId: number): Promise<CommentView[]> {
  const res = await fetch(`${API_BASE}/api/v1/public/posts/${postId}/comments`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as CommentView[];
}

/** Authenticated — create a comment or reply (parentId for a reply to a top-level comment). */
export function createComment(
  postId: number,
  body: string,
  parentId?: number | null,
): Promise<CommentView> {
  return request<CommentView>(`/api/v1/posts/${postId}/comments`, {
    method: "POST",
    body: { body, parentId: parentId ?? null },
  });
}

/** Authenticated — delete own comment (or any, if post owner). */
export function deleteComment(id: number): Promise<void> {
  return request(`/api/v1/comments/${id}`, { method: "DELETE" });
}
