import { request } from "@/lib/api/client";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

export interface MentionCandidate {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  following: boolean;
}

const MOCK: MentionCandidate[] = [
  { username: "yuna", displayName: "유나", avatarUrl: "https://i.pravatar.cc/120?img=20", following: true },
  { username: "minji", displayName: null, avatarUrl: "https://i.pravatar.cc/120?img=5", following: true },
  { username: "kazuki", displayName: "카즈키", avatarUrl: null, following: false },
  { username: "haruka", displayName: "하루카", avatarUrl: null, following: false },
];

export function listMentionCandidates(query: string): Promise<MentionCandidate[]> {
  if (USE_MOCKS) {
    const q = query.toLowerCase();
    return Promise.resolve(
      q ? MOCK.filter((c) => c.username.startsWith(q) || (c.displayName ?? "").toLowerCase().startsWith(q)) : MOCK.filter((c) => c.following),
    );
  }
  const params = new URLSearchParams({ q: query, limit: "6" });
  return request<MentionCandidate[]>(`/api/v1/users/me/mention-candidates?${params}`, { method: "GET" });
}
