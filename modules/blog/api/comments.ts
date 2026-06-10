import { request } from "@/lib/api/client";
import { USE_MOCKS } from "@/modules/blog/api/_mocks";
import type { PublicAuthor } from "./public-posts";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export interface CommentView {
  id: number;
  parentId: number | null;
  author: PublicAuthor | null;
  body: string;
  createdAt: string;
  likeCount: number;
}

export interface CommentLikeStatus {
  likeCount: number;
  liked: boolean;
}

// In-memory mock thread (demo mode) so the comment list / reply / submit / delete all work without a
// backend. Shared across posts — fine for a demo.
const MOCK_VIEWER: PublicAuthor = { id: 9001, username: "reader", bio: null, avatarUrl: null };
let mockComments: CommentView[] = [
  { id: 1, parentId: null, author: { id: 2, username: "minji", bio: null, avatarUrl: "https://i.pravatar.cc/120?img=45" }, body: "잘 읽었어요. RSC 전환 부분 특히 공감합니다.", createdAt: "2026-05-30T10:00:00Z", likeCount: 3 },
  { id: 2, parentId: 1, author: { id: 1, username: "dohyun", bio: null, avatarUrl: "https://i.pravatar.cc/120?img=12" }, body: "감사해요! 다음 글에서 더 자세히 다뤄볼게요.", createdAt: "2026-05-30T11:00:00Z", likeCount: 0 },
  { id: 3, parentId: null, author: { id: 4, username: "kazuki", bio: null, avatarUrl: "https://i.pravatar.cc/120?img=33" }, body: "트레이드오프 정리가 깔끔하네요 👍", createdAt: "2026-05-30T12:30:00Z", likeCount: 1 },
];
let mockCommentSeq = 100;
const mockLiked = new Set<number>();

/** Public — anyone can read a post's comments (oldest first, flat with parentId). */
export async function listComments(postId: number): Promise<CommentView[]> {
  if (USE_MOCKS) return [...mockComments];
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
  if (USE_MOCKS) {
    const c: CommentView = {
      id: ++mockCommentSeq,
      parentId: parentId ?? null,
      author: MOCK_VIEWER,
      body,
      createdAt: new Date().toISOString(),
      likeCount: 0,
    };
    mockComments = [...mockComments, c];
    return Promise.resolve(c);
  }
  return request<CommentView>(`/api/v1/posts/${postId}/comments`, {
    method: "POST",
    body: { body, parentId: parentId ?? null },
  });
}

/** Authenticated — delete own comment (or any, if post owner). */
export function deleteComment(id: number): Promise<void> {
  if (USE_MOCKS) {
    mockComments = mockComments.filter((c) => c.id !== id && c.parentId !== id);
    return Promise.resolve();
  }
  return request(`/api/v1/comments/${id}`, { method: "DELETE" });
}

/** Authenticated — like a comment (idempotent; the response carries the authoritative count). */
export function likeComment(id: number): Promise<CommentLikeStatus> {
  if (USE_MOCKS) {
    const c = mockComments.find((x) => x.id === id);
    if (c && !mockLiked.has(id)) {
      mockLiked.add(id);
      c.likeCount += 1;
    }
    return Promise.resolve({ likeCount: c?.likeCount ?? 0, liked: true });
  }
  return request<CommentLikeStatus>(`/api/v1/comments/${id}/like`, { method: "POST" });
}

/** Authenticated — remove the viewer's like on a comment. */
export function unlikeComment(id: number): Promise<CommentLikeStatus> {
  if (USE_MOCKS) {
    const c = mockComments.find((x) => x.id === id);
    if (c && mockLiked.has(id)) {
      mockLiked.delete(id);
      c.likeCount = Math.max(0, c.likeCount - 1);
    }
    return Promise.resolve({ likeCount: c?.likeCount ?? 0, liked: false });
  }
  return request<CommentLikeStatus>(`/api/v1/comments/${id}/like`, { method: "DELETE" });
}

/** Authenticated — of this post's comments, the ids the viewer liked (drives likedByMe). */
export function listLikedCommentIds(postId: number): Promise<number[]> {
  if (USE_MOCKS) return Promise.resolve([...mockLiked]);
  return request<number[]>(`/api/v1/posts/${postId}/comments/liked`, { method: "GET" });
}
