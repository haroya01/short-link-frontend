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
