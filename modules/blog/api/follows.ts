import { request } from "@/lib/api/client";
import { USE_MOCKS, mockFollowingView } from "@/modules/blog/api/_mocks";
import type { PublicFeedView } from "@/modules/blog/api/public-posts";

/** Authenticated — posts from authors the current user follows (the "피드" tab). */
export function listFollowingFeed(page = 0, size = 24): Promise<PublicFeedView> {
  if (USE_MOCKS) return Promise.resolve(mockFollowingView());
  return request<PublicFeedView>(`/api/v1/feed/following?page=${page}&size=${size}`, {
    method: "GET",
  });
}

export interface FollowStatus {
  following: boolean;
  followerCount: number;
  followingCount: number;
}

/** Public — follower count for everyone; `following` is false for anonymous viewers. */
export function getFollowStatus(username: string): Promise<FollowStatus> {
  return request<FollowStatus>(`/api/v1/users/${encodeURIComponent(username)}/follow`, {
    method: "GET",
  });
}

export function followUser(username: string): Promise<FollowStatus> {
  return request<FollowStatus>(`/api/v1/users/${encodeURIComponent(username)}/follow`, {
    method: "PUT",
  });
}

export function unfollowUser(username: string): Promise<FollowStatus> {
  return request<FollowStatus>(`/api/v1/users/${encodeURIComponent(username)}/follow`, {
    method: "DELETE",
  });
}
