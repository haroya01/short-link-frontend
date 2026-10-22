import { request } from "@/lib/api/client";
import { readStorageString } from "@/lib/storage-json";
import type { PublicAuthor, PublicFeedView } from "@/modules/blog/api/public-posts";
import { blogMocks } from "@/modules/blog/api/_mock-gates";
import type { RemoteAccount } from "@/modules/notes/api/notes";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";
const remoteMocks: typeof import("@/modules/notes/api/_mocks") | null =
  process.env.NEXT_PUBLIC_USE_MOCKS === "1" ? require("@/modules/notes/api/_mocks") : null;

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
  /** Accepted follows with accounts on other servers. Absent on an older backend and on a hidden author. */
  remoteFollowerCount?: number;
  remoteFollowingCount?: number;
  hideFollowerCount: boolean;
  /** The viewer rang this author's bell: a notice for every new note (Mastodon's notify). */
  notifyNotes?: boolean;
  /** The viewer's follow waits on this locked author's approval. */
  requested?: boolean;
  /** The author approves each follower by hand (Mastodon's locked account): following leaves a request. */
  locked?: boolean;
  blockedByViewer?: boolean;
  blocksViewer?: boolean;
}

// Mock lane: haruka approves followers by hand, so following her leaves a request; sora hides follower counts;
// kurl:mock-following lists the authors a spec has the viewer already follow; kazuki also has follows on other servers.
const MOCK_LOCKED = new Set(["haruka"]);
const MOCK_HIDES_COUNTS = new Set(["sora"]);
const mockRequested = new Set<string>();
const MOCK_FOLLOWING_KEY = "kurl:mock-following";
const MOCK_REMOTE_FOLLOWS: Record<string, Record<FollowListKind, { at: number; id: number }[]>> = {
  kazuki: { following: [{ at: 1, id: 9801 }, { at: 3, id: 9806 }], followers: [{ at: 2, id: 9803 }] },
};

function mockFollowing(username: string): boolean {
  return readStorageString(MOCK_FOLLOWING_KEY)?.split(",").includes(username) === true;
}

function mockRemoteCounts(username: string) {
  const remote = MOCK_REMOTE_FOLLOWS[username];
  return remote ? { remoteFollowerCount: remote.followers.length, remoteFollowingCount: remote.following.length } : {};
}

function mockStatus(username: string, following: boolean): FollowStatus {
  const hidden = MOCK_HIDES_COUNTS.has(username);
  return {
    following,
    ...(hidden ? {} : { followerCount: following ? 129 : 128, followingCount: 12, ...mockRemoteCounts(username) }),
    hideFollowerCount: hidden,
    requested: mockRequested.has(username),
    locked: MOCK_LOCKED.has(username),
    blocksViewer: blogMocks?.MOCK_BLOCKS_VIEWER.has(username) ?? false,
  };
}

/** Public — follower count for everyone; `following` is false for anonymous viewers. */
export function getFollowStatus(username: string): Promise<FollowStatus> {
  if (USE_MOCKS) return Promise.resolve(mockStatus(username, mockFollowing(username)));
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
    blogMocks?.mockSetFollowing(username, true);
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
    blogMocks?.mockSetFollowing(username, false);
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
  { id: 15, username: "yuna", bio: null, avatarUrl: null, followerCount: 12, followedByMe: false },
  { id: 3, username: "haruka", bio: null, avatarUrl: null, followerCount: 40, followedByMe: false },
  { id: 9201, username: "mallory", bio: null, avatarUrl: null, followerCount: 3, followedByMe: false },
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

export type FollowEntry = ({ type: "local" } & FollowUser) | { type: "remote"; account: RemoteAccount };

export interface FollowEntryPage {
  items: FollowEntry[];
  page: number;
  size: number;
  hasNext: boolean;
}

export type FollowListKind = "followers" | "following";

export function followEntries(items: unknown[]): FollowEntry[] {
  return items.filter((item): item is FollowEntry => {
    if (typeof item !== "object" || item === null) return false;
    const entry = item as { type?: unknown; account?: unknown };
    if (entry.type === "local") return true;
    return entry.type === "remote" && typeof entry.account === "object" && entry.account !== null;
  });
}

export const followEntryKey = (entry: FollowEntry) =>
  entry.type === "local" ? `local:${entry.id}` : `remote:${entry.account.id}`;

async function mockFollowEntries(username: string, kind: FollowListKind): Promise<FollowEntry[]> {
  const locals: FollowEntry[] = MOCK_FOLLOW_USERS.map((u) => ({ type: "local", ...u }));
  const remotes = MOCK_REMOTE_FOLLOWS[username]?.[kind] ?? [];
  const accounts = await Promise.all(remotes.map((r) => remoteMocks!.mockRemoteAccount(r.id)));
  const mixed = [...locals];
  remotes.forEach((r, i) => mixed.splice(r.at, 0, { type: "remote", account: accounts[i] }));
  return mixed;
}

export async function listFollowEntries(
  username: string,
  kind: FollowListKind,
  page = 0,
  size = 20,
): Promise<FollowEntryPage> {
  if (USE_MOCKS && remoteMocks) {
    return { items: await mockFollowEntries(username, kind), page, size, hasNext: false };
  }
  const res = await request<{ items: unknown[]; page: number; size: number; hasNext: boolean }>(
    `/api/v1/users/${encodeURIComponent(username)}/${kind}?page=${page}&size=${size}&include=remote`,
    { method: "GET" },
  );
  return { ...res, items: followEntries(res.items) };
}

export function followCountTotals(s: FollowStatus): { followers: number; following: number } | null {
  if (s.hideFollowerCount || s.followerCount == null || s.followingCount == null) return null;
  return {
    followers: s.followerCount + (s.remoteFollowerCount ?? 0),
    following: s.followingCount + (s.remoteFollowingCount ?? 0),
  };
}

/** Someone the viewer blocked — newest first. */
export interface BlockedUser {
  id: number;
  username: string;
  avatarUrl: string | null;
}

let mockBlocked: BlockedUser[] = [{ id: 9201, username: "mallory", avatarUrl: null }];

export function listBlockedUsers(): Promise<BlockedUser[]> {
  if (USE_MOCKS) return Promise.resolve(mockBlocked);
  return request<BlockedUser[]>("/api/v1/users/me/blocks", { method: "GET" });
}

/** The server also ends every follow and pending follow request between the two, both ways. */
export async function blockUser(username: string): Promise<void> {
  if (USE_MOCKS) {
    mockRequested.delete(username);
    if (!mockBlocked.some((u) => u.username === username)) {
      mockBlocked = [{ id: 9300 + mockBlocked.length, username, avatarUrl: null }, ...mockBlocked];
    }
    return;
  }
  await request<void>(`/api/v1/users/${encodeURIComponent(username)}/block`, { method: "PUT" });
}

export async function unblockUser(username: string): Promise<void> {
  if (USE_MOCKS) {
    mockBlocked = mockBlocked.filter((u) => u.username !== username);
    return;
  }
  await request<void>(`/api/v1/users/${encodeURIComponent(username)}/block`, { method: "DELETE" });
}
