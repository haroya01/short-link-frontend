import { request } from "@/lib/api/client";

export interface LikeStatus {
  likeCount: number;
  liked: boolean;
}

/** Authenticated — current user's like state for a post. */
export function getLikeStatus(postId: number): Promise<LikeStatus> {
  return request<LikeStatus>(`/api/v1/posts/${postId}/like`, { method: "GET" });
}

export function likePost(postId: number): Promise<LikeStatus> {
  return request<LikeStatus>(`/api/v1/posts/${postId}/like`, { method: "PUT" });
}

export function unlikePost(postId: number): Promise<LikeStatus> {
  return request<LikeStatus>(`/api/v1/posts/${postId}/like`, { method: "DELETE" });
}
