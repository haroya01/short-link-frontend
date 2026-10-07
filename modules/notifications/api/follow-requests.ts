import { request } from "@/lib/api/client";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

/** Someone waiting on the viewer's approval (Mastodon's locked account): a member here, or an account
 *  elsewhere identified by its id on this server. */
export interface FollowRequest {
  key: string;
  origin: { member: string } | { remoteId: number };
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  requestedAt: string | null;
}

interface MemberRow {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  requestedAt: string | null;
}

interface RemoteRow {
  id: number;
  acct: string;
  displayName: string | null;
  avatarUrl: string | null;
  requestedAt: string | null;
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
let mockMembers: MemberRow[] = [{ username: "sori", displayName: "소리", avatarUrl: null, requestedAt: minutesAgo(20) }];
let mockRemotes: RemoteRow[] = [
  { id: 9810, acct: "carol@fosstodon.org", displayName: "Carol", avatarUrl: null, requestedAt: minutesAgo(60) },
];

/** Mock lane: who still waits, for the FOLLOW_REQUEST notices. */
export function mockPendingFollowRequests(): FollowRequest[] {
  return merge(mockMembers, mockRemotes);
}

/** Mock lane: the viewer turned the lock off, so everyone waiting is let in. */
export function mockApproveAllFollowRequests() {
  mockMembers = [];
  mockRemotes = [];
}

function merge(members: MemberRow[], remotes: RemoteRow[]): FollowRequest[] {
  return [
    ...members.map((m) => ({
      key: `member:${m.username}`,
      origin: { member: m.username },
      handle: m.username,
      displayName: m.displayName,
      avatarUrl: m.avatarUrl,
      requestedAt: m.requestedAt,
    })),
    ...remotes.map((r) => ({
      key: `remote:${r.id}`,
      origin: { remoteId: r.id },
      handle: r.acct,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl,
      requestedAt: r.requestedAt,
    })),
  ].sort((a, b) => (b.requestedAt ?? "").localeCompare(a.requestedAt ?? ""));
}

/** Both lists' first page (40 each), newest request first. */
export async function listFollowRequests(): Promise<FollowRequest[]> {
  if (USE_MOCKS) return merge(mockMembers, mockRemotes);
  const [members, remotes] = await Promise.all([
    request<MemberRow[]>("/api/v1/users/me/follow-requests", { method: "GET" }),
    request<RemoteRow[]>("/api/v1/federation/follow-requests", { method: "GET" }),
  ]);
  return merge(members, remotes);
}

function path(origin: FollowRequest["origin"]): string {
  return "member" in origin
    ? `/api/v1/users/me/follow-requests/${encodeURIComponent(origin.member)}`
    : `/api/v1/federation/follow-requests/${origin.remoteId}`;
}

export async function answerFollowRequest(origin: FollowRequest["origin"], approve: boolean): Promise<void> {
  if (USE_MOCKS) {
    if ("member" in origin) mockMembers = mockMembers.filter((m) => m.username !== origin.member);
    else mockRemotes = mockRemotes.filter((r) => r.id !== origin.remoteId);
    return;
  }
  await request<void>(`${path(origin)}/${approve ? "authorize" : "reject"}`, { method: "POST" });
}
