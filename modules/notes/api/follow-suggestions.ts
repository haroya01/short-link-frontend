import { request } from "@/lib/api/client";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

/** Mastodon's follow suggestions: whom the people the viewer follows follow, else active popular accounts. */
export interface FollowSuggestion {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  mutuals: number;
  reason: "FRIENDS" | "POPULAR";
  locked?: boolean;
}

let mockPicks: FollowSuggestion[] = [
  { username: "haruka", displayName: "하루카", avatarUrl: null, bio: null, mutuals: 3, reason: "FRIENDS", locked: true },
  { username: "minji", displayName: null, avatarUrl: null, bio: null, mutuals: 1, reason: "FRIENDS" },
  { username: "yuna", displayName: null, avatarUrl: null, bio: null, mutuals: 0, reason: "POPULAR" },
];

export function listFollowSuggestions(): Promise<FollowSuggestion[]> {
  if (USE_MOCKS) return Promise.resolve(mockPicks);
  return request<FollowSuggestion[]>("/api/v1/users/me/suggestions?limit=10", { method: "GET" });
}

export async function dismissFollowSuggestion(username: string): Promise<void> {
  if (USE_MOCKS) {
    mockPicks = mockPicks.filter((p) => p.username !== username);
    return;
  }
  await request<void>(`/api/v1/users/me/suggestions/${encodeURIComponent(username)}`, { method: "DELETE" });
}
