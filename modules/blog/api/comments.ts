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

/** One of the viewer's own comments, with enough post context to link back to where it was written. */
export interface MyComment {
  id: number;
  parentId: number | null;
  body: string;
  createdAt: string;
  likeCount: number;
  postSlug: string;
  postTitle: string;
  postUsername: string;
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

// "내 댓글 모아보기" — the viewer's own comments across all posts, newest first, with post context.
const mockMyComments: MyComment[] = [
  {
    id: 9101,
    parentId: null,
    body: "RSC 전환 부분 정리가 깔끔해요. 저도 `loading.tsx` 도입하면서 비슷한 고민을 했는데 **스트리밍** 경계 잡는 게 핵심이더라고요.",
    createdAt: "2026-06-12T09:20:00Z",
    likeCount: 4,
    postSlug: "nextjs-14-app-router-blog",
    postTitle: "Next.js 14 App Router로 블로그 만들기",
    postUsername: "dohyun",
  },
  {
    id: 9102,
    parentId: 1,
    body: "> 작은 서비스엔 과했을까\n\n저는 결국 포트만 남기고 어댑터는 단순화했어요. 트레이드오프 표가 특히 도움됐습니다.",
    createdAt: "2026-06-09T14:05:00Z",
    likeCount: 1,
    postSlug: "hexagonal-too-much",
    postTitle: "헥사고날 아키텍처, 작은 서비스에 과했을까",
    postUsername: "haruka",
  },
  {
    id: 9103,
    parentId: null,
    body: "디자인 토큰을 Tailwind로 옮기는 흐름 좋네요 👍",
    createdAt: "2026-06-03T20:41:00Z",
    likeCount: 0,
    postSlug: "design-tokens-to-tailwind",
    postTitle: "디자인 시스템 토큰을 Tailwind로 옮기며",
    postUsername: "minji",
  },
];

/** Authenticated — the viewer's own comments across every post (newest first, with post context). */
export function listMyComments(): Promise<MyComment[]> {
  if (USE_MOCKS) return Promise.resolve([...mockMyComments]);
  return request<MyComment[]>("/api/v1/users/me/comments", { method: "GET" });
}
