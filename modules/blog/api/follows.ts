import { request } from "@/lib/api/client";
import type { PublicAuthor, PublicFeedView } from "@/modules/blog/api/public-posts";
import { blogMocks } from "@/modules/blog/api/_mock-gates";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

export interface FollowingSeriesNote {
  id: number;
  author: PublicAuthor;
  body: string;
  contentWarning: string | null;
  excerpt: string | null;
  createdAt: string;
  series: { id: number; slug: string; title: string };
}

/** A page may carry only notes while hasNext stays true. */
export interface FollowingFeedView extends PublicFeedView {
  seriesNotes?: FollowingSeriesNote[];
}

/** Authenticated — posts from authors the current user follows (the "피드" tab). */
export function listFollowingFeed(page = 0, size = 24): Promise<FollowingFeedView> {
  if (blogMocks) return Promise.resolve(blogMocks.mockFollowingFeed(page));
  return request<FollowingFeedView>(`/api/v1/feed/following?page=${page}&size=${size}`, {
    method: "GET",
  });
}

/**
 * Authenticated — the "For You" feed: posts ranked by the reader's tag affinity (followed tags +
 * tags of what they've read/liked), excluding already-read. Cold-start (no signal) falls back to
 * trending server-side, so a signed-in reader always gets something.
 */
export function listForYouFeed(page = 0, size = 24): Promise<PublicFeedView> {
  if (blogMocks) return Promise.resolve(blogMocks.mockFollowingView());
  return request<PublicFeedView>(`/api/v1/feed/for-you?page=${page}&size=${size}`, {
    method: "GET",
  });
}

export interface FollowStatus {
  following: boolean;
  /**
   * Absent when the author hides their counts (`hideFollowerCount` true) — the backend omits the
   * key entirely (`@JsonInclude(NON_NULL)`), so it deserializes to `undefined` here. Surfaces treat
   * `undefined` the same as the flag: show the follow control, hide the number.
   */
  followerCount?: number;
  followingCount?: number;
  hideFollowerCount: boolean;
  /** The viewer rang this author's bell: a notice for every new note (Mastodon's notify). */
  notifyNotes?: boolean;
  /** The viewer's follow waits on this locked author's approval. */
  requested?: boolean;
  /** The author approves each follower by hand (Mastodon's locked account): following leaves a request. */
  locked?: boolean;
}

// Mock lane: haruka approves followers by hand, so following her leaves a request.
const MOCK_LOCKED = new Set(["haruka"]);
const mockRequested = new Set<string>();

function mockStatus(username: string, following: boolean): FollowStatus {
  return {
    following,
    followerCount: following ? 129 : 128,
    followingCount: 12,
    hideFollowerCount: false,
    requested: mockRequested.has(username),
    locked: MOCK_LOCKED.has(username),
  };
}

/** Public — follower count for everyone; `following` is false for anonymous viewers. */
export function getFollowStatus(username: string): Promise<FollowStatus> {
  if (USE_MOCKS) return Promise.resolve(mockStatus(username, false));
  return request<FollowStatus>(`/api/v1/users/${encodeURIComponent(username)}/follow`, {
    method: "GET",
  });
}

/**
 * Follow an author. `sourcePostId` attributes the follow to the post the reader was on when they
 * followed — it powers the per-post "이 글로 늘어난 팔로우" analytics. Omitted for a direct profile follow.
 */
export function followUser(username: string, sourcePostId?: number): Promise<FollowStatus> {
  if (USE_MOCKS) {
    if (MOCK_LOCKED.has(username)) {
      mockRequested.add(username);
      return Promise.resolve(mockStatus(username, false));
    }
    return Promise.resolve(mockStatus(username, true));
  }
  const q = sourcePostId != null ? `?sourcePostId=${sourcePostId}` : "";
  return request<FollowStatus>(`/api/v1/users/${encodeURIComponent(username)}/follow${q}`, {
    method: "PUT",
  });
}

export function unfollowUser(username: string): Promise<FollowStatus> {
  if (USE_MOCKS) {
    mockRequested.delete(username);
    return Promise.resolve(mockStatus(username, false));
  }
  return request<FollowStatus>(`/api/v1/users/${encodeURIComponent(username)}/follow`, {
    method: "DELETE",
  });
}

let mockBell = false;

/** Only a follower can ring the bell; the server answers 409 NOT_FOLLOWING otherwise. */
export function setNoteNotifications(username: string, on: boolean): Promise<{ notifyNotes: boolean }> {
  if (USE_MOCKS) {
    mockBell = on;
    return Promise.resolve({ notifyNotes: mockBell });
  }
  return request<{ notifyNotes: boolean }>(`/api/v1/users/${encodeURIComponent(username)}/follow/notes`, {
    method: on ? "PUT" : "DELETE",
  });
}

/** One row of a followers / following list — author info + the viewer's own follow state. */
export interface FollowUser {
  id: number;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  followerCount: number;
  followedByMe: boolean;
}

export interface FollowListPage {
  items: FollowUser[];
  page: number;
  size: number;
  hasNext: boolean;
}

const MOCK_FOLLOW_USERS: FollowUser[] = [
  { id: 9101, username: "haneul", bio: "프로덕트 디자이너", avatarUrl: null, followerCount: 320, followedByMe: false },
  { id: 9102, username: "minseo", bio: "백엔드 엔지니어", avatarUrl: null, followerCount: 88, followedByMe: true },
  { id: 9103, username: "yuna", bio: null, avatarUrl: null, followerCount: 12, followedByMe: false },
];

/** Public — users who follow `username` (newest first). */
export function listFollowers(username: string, page = 0, size = 20): Promise<FollowListPage> {
  if (USE_MOCKS) return Promise.resolve({ items: MOCK_FOLLOW_USERS, page, size, hasNext: false });
  return request<FollowListPage>(
    `/api/v1/users/${encodeURIComponent(username)}/followers?page=${page}&size=${size}`,
    { method: "GET" },
  );
}

/** Public — users `username` follows (most recently followed first). */
export function listFollowing(username: string, page = 0, size = 20): Promise<FollowListPage> {
  if (USE_MOCKS) return Promise.resolve({ items: MOCK_FOLLOW_USERS, page, size, hasNext: false });
  return request<FollowListPage>(
    `/api/v1/users/${encodeURIComponent(username)}/following?page=${page}&size=${size}`,
    { method: "GET" },
  );
}
