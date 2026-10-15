import { request } from "@/lib/api/client";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

export type PolicyLevel = "ACCEPT" | "FILTER" | "DROP";

/** Mastodon's notification policy: per kind of sender, accept, keep aside (filter) or drop. */
export interface NotificationPolicy {
  forNotFollowing: PolicyLevel;
  forNotFollowers: PolicyLevel;
  forNewAccounts: PolicyLevel;
  forPrivateMentions: PolicyLevel;
}

/** Someone whose notices the policy kept aside — a member here, or an account elsewhere. */
export interface FilteredSender {
  actorUserId: number | null;
  actorRemoteId: number | null;
  username: string;
  avatarUrl: string | null;
  profileUrl: string | null;
  count: number;
  lastAt: string | null;
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
let mockPolicy: NotificationPolicy = {
  forNotFollowing: "FILTER",
  forNotFollowers: "ACCEPT",
  forNewAccounts: "ACCEPT",
  forPrivateMentions: "FILTER",
};
let mockSenders: FilteredSender[] = [
  { actorUserId: 9301, actorRemoteId: null, username: "promo_bot", avatarUrl: null, profileUrl: null, count: 3, lastAt: minutesAgo(25) },
  {
    actorUserId: null,
    actorRemoteId: 9800,
    username: "mina@mastodon.social",
    avatarUrl: null,
    profileUrl: "https://mastodon.social/@mina",
    count: 1,
    lastAt: minutesAgo(120),
  },
];

export function getNotificationPolicy(): Promise<NotificationPolicy> {
  if (USE_MOCKS) return Promise.resolve(mockPolicy);
  return request<NotificationPolicy>("/api/v1/notifications/policy", { method: "GET" });
}

export function updateNotificationPolicy(patch: Partial<NotificationPolicy>): Promise<NotificationPolicy> {
  if (USE_MOCKS) {
    mockPolicy = { ...mockPolicy, ...patch };
    return Promise.resolve(mockPolicy);
  }
  return request<NotificationPolicy>("/api/v1/notifications/policy", { method: "PUT", body: patch });
}

export function listFilteredSenders(): Promise<FilteredSender[]> {
  if (USE_MOCKS) return Promise.resolve(mockSenders);
  return request<FilteredSender[]>("/api/v1/notifications/requests", { method: "GET" });
}

/** Accept lets the kept notices in and every later one through; dismiss throws the kept ones away. */
export async function answerFilteredSender(sender: FilteredSender, accept: boolean): Promise<void> {
  if (USE_MOCKS) {
    mockSenders = mockSenders.filter((s) => !(s.actorUserId === sender.actorUserId && s.actorRemoteId === sender.actorRemoteId));
    return;
  }
  await request<void>(`/api/v1/notifications/requests/${accept ? "accept" : "dismiss"}`, {
    method: "POST",
    body: { actorUserId: sender.actorUserId, actorRemoteId: sender.actorRemoteId },
  });
}
