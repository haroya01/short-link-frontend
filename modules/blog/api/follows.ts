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
  if (USE_MOCKS)
    return Promise.resolve({ following: false, followerCount: 128, followingCount: 12 });
  return request<FollowStatus>(`/api/v1/users/${encodeURIComponent(username)}/follow`, {
    method: "GET",
  });
}

/**
 * Follow an author. `sourcePostId` attributes the follow to the post the reader was on when they
 * followed — it powers the per-post "이 글로 늘어난 팔로우" analytics. Omitted for a direct profile follow.
 */
export function followUser(username: string, sourcePostId?: number): Promise<FollowStatus> {
  if (USE_MOCKS)
    return Promise.resolve({ following: true, followerCount: 129, followingCount: 12 });
  const q = sourcePostId != null ? `?sourcePostId=${sourcePostId}` : "";
  return request<FollowStatus>(`/api/v1/users/${encodeURIComponent(username)}/follow${q}`, {
    method: "PUT",
  });
}

export function unfollowUser(username: string): Promise<FollowStatus> {
  if (USE_MOCKS)
    return Promise.resolve({ following: false, followerCount: 128, followingCount: 12 });
  return request<FollowStatus>(`/api/v1/users/${encodeURIComponent(username)}/follow`, {
    method: "DELETE",
  });
}
