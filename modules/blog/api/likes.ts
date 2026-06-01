import { request } from "@/lib/api/client";
import { USE_MOCKS } from "@/modules/blog/api/_mocks";

export interface LikeStatus {
  likeCount: number;
  liked: boolean;
}

/** Authenticated — current user's like state for a post. */
export function getLikeStatus(postId: number): Promise<LikeStatus> {
  if (USE_MOCKS) return Promise.resolve({ likeCount: 62, liked: false });
  return request<LikeStatus>(`/api/v1/posts/${postId}/like`, { method: "GET" });
}

export function likePost(postId: number): Promise<LikeStatus> {
  if (USE_MOCKS) return Promise.resolve({ likeCount: 63, liked: true });
  return request<LikeStatus>(`/api/v1/posts/${postId}/like`, { method: "PUT" });
}

export function unlikePost(postId: number): Promise<LikeStatus> {
  if (USE_MOCKS) return Promise.resolve({ likeCount: 62, liked: false });
  return request<LikeStatus>(`/api/v1/posts/${postId}/like`, { method: "DELETE" });
}

/** One entry in the "liked posts" list — post id + author handle and post slug/title to link to. */
export interface LikedPost {
  id: number;
  username: string;
  title: string;
  slug: string;
}

/** The signed-in user's liked posts, newest-liked first. */
export function listLikedPosts(): Promise<LikedPost[]> {
  if (USE_MOCKS) return Promise.resolve([]);
  return request<LikedPost[]>(`/api/v1/users/me/likes`, { method: "GET" });
}
