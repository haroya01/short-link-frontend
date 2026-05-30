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
}

// In-memory mock thread (demo mode) so the comment list / reply / submit / delete all work without a
// backend. Shared across posts — fine for a demo.
const MOCK_VIEWER: PublicAuthor = { id: 9001, username: "reader", bio: null, avatarUrl: null };
let mockComments: CommentView[] = [
  { id: 1, parentId: null, author: { id: 2, username: "minji", bio: null, avatarUrl: "https://i.pravatar.cc/120?img=45" }, body: "잘 읽었어요. RSC 전환 부분 특히 공감합니다.", createdAt: "2026-05-30T10:00:00Z" },
  { id: 2, parentId: 1, author: { id: 1, username: "dohyun", bio: null, avatarUrl: "https://i.pravatar.cc/120?img=12" }, body: "감사해요! 다음 글에서 더 자세히 다뤄볼게요.", createdAt: "2026-05-30T11:00:00Z" },
  { id: 3, parentId: null, author: { id: 4, username: "kazuki", bio: null, avatarUrl: "https://i.pravatar.cc/120?img=33" }, body: "트레이드오프 정리가 깔끔하네요 👍", createdAt: "2026-05-30T12:30:00Z" },
];
let mockCommentSeq = 100;

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
