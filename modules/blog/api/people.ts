import { mockFailure, request } from "@/lib/api/client";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

/** Shorter queries never reach the server, which answers them with an empty page. */
export const PEOPLE_MIN_QUERY = 2;
const PEOPLE_MAX_QUERY = 30;

export interface PersonMatch {
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  /** Null when the person hides their follower count. */
  followerCount: number | null;
  following: boolean;
  requested: boolean;
}

export interface PeoplePage {
  items: PersonMatch[];
  page: number;
  size: number;
  hasNext: boolean;
}

/** The server's reading of a query: trimmed, one leading @ dropped, cut at 30 characters. */
export function peopleQuery(raw: string): string {
  let q = raw.trim();
  if (q.startsWith("@")) q = q.slice(1).trim();
  return Array.from(q).slice(0, PEOPLE_MAX_QUERY).join("");
}

export function searchablePeopleQuery(raw: string): boolean {
  return Array.from(peopleQuery(raw)).length >= PEOPLE_MIN_QUERY;
}

const mockPeople: PersonMatch[] = [
  { userId: 3, username: "haruka", displayName: "하루카", avatarUrl: null, bio: "도쿄에서 읽고 씁니다. 책과 산책.", followerCount: 128, following: false, requested: false },
  { userId: 13, username: "haruki", displayName: "Haruki", avatarUrl: "https://i.pravatar.cc/120?img=8", bio: null, followerCount: 54, following: false, requested: false },
  { userId: 2, username: "minji", displayName: "민지", avatarUrl: null, bio: "프론트엔드 개발자. 타입스크립트와 접근성 이야기를 씁니다.", followerCount: null, following: false, requested: false },
  { userId: 15, username: "yuna", displayName: "유나", avatarUrl: null, bio: "디자인 노트", followerCount: 12, following: false, requested: false },
];

function mockSearchPeople(q: string, page: number, size: number): PeoplePage {
  const needle = q.toLowerCase();
  const found = mockPeople.filter(
    (p) => p.username.toLowerCase().startsWith(needle) || (p.displayName ?? "").toLowerCase().includes(needle),
  );
  const items = found.slice(page * size, page * size + size);
  return { items, page, size, hasNext: found.length > (page + 1) * size };
}

export function searchPeople(raw: string, page = 0, size = 20): Promise<PeoplePage> {
  const q = peopleQuery(raw);
  if (Array.from(q).length < PEOPLE_MIN_QUERY) return Promise.resolve({ items: [], page, size, hasNext: false });
  if (USE_MOCKS) return mockFailure("people") ?? Promise.resolve(mockSearchPeople(q, page, size));
  const params = new URLSearchParams({ q, page: String(page), size: String(size) });
  return request<PeoplePage>(`/api/v1/public/users/search?${params.toString()}`, { method: "GET" });
}
