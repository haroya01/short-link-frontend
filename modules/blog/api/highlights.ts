import { request } from "@/lib/api/client";
import { USE_MOCKS } from "@/modules/blog/api/_mocks";
import { mockHighlightFeed, mockMyHighlights } from "@/modules/blog/api/_mocks-collections";
import type { FeedSource } from "./collections";
import type { PublicAuthor } from "./public-posts";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/** A public, attributed reader highlight — who highlighted which span (block + char offsets + quote),
 *  with an optional public memo (the curator's margin note shown alongside the highlight). */
export interface HighlightView {
  id: number;
  author: PublicAuthor | null;
  /** First block of the span. */
  blockOrder: number;
  /** Last block of the span (== blockOrder for a single-block highlight). */
  endBlockOrder: number;
  /** Char offset of the start within blockOrder, and of the end within endBlockOrder. */
  startOffset: number;
  endOffset: number;
  quote: string;
  note: string | null;
  /** Number of replies in the highlight's thread — drives the "conversation here" marker. */
  replyCount: number;
  createdAt: string;
}

export interface NewHighlight {
  blockOrder: number;
  endBlockOrder: number;
  startOffset: number;
  endOffset: number;
  quote: string;
  note?: string | null;
}

/** One of the viewer's own highlights, carrying the source post it was drawn on so the library can
 *  group by post and deep-link back to the sentence (`?hl=`). Mirrors the iOS MyHighlightsView shape /
 *  the backend `GET /users/me/highlights`. */
export interface MyHighlightItem {
  id: number;
  quote: string;
  note: string | null;
  /** The post this highlight lives on. */
  postUsername: string;
  postSlug: string;
  postTitle: string;
  createdAt: string;
}

/** One entry in the "남들 하이라이트" feed — a passage a followed curator drew, carried with the post it
 *  lives in so the reader can jump to that sentence (`?hl=`). `curator` highlighted it; `postAuthorUsername`
 *  wrote the post (they can differ). Mirrors the backend `HighlightFeedItem` / the iOS `HighlightFeedItemView`. */
export interface HighlightFeedItem {
  id: number;
  postId: number;
  /** Who drew the highlight (the curator) — null only for an optimistic local add. */
  curator: PublicAuthor | null;
  postSlug: string;
  postTitle: string;
  /** Who wrote the post (attribution + the deep-link's author segment). */
  postAuthorUsername: string | null;
  blockOrder: number;
  endBlockOrder: number;
  startOffset: number;
  endOffset: number;
  quote: string;
  /** The curator's public margin note, if any. */
  note: string | null;
  createdAt: string;
  /** Replies in the highlight's thread — drives the "conversation here" marker. */
  replyCount: number;
}

/** One page of the highlight feed (newest first). Mirrors the backend `HighlightFeedView`. */
export interface HighlightFeedPage {
  items: HighlightFeedItem[];
  page: number;
  size: number;
  hasNext: boolean;
  /** "global" when the backend served the cold-start fallback (following nobody / empty page 0)
   *  instead of the follow graph. Absent on a server that predates the field → treated as
   *  "following". See {@link FeedSource}. */
  source?: FeedSource;
}

/** One reply in a highlight's thread (the author's note is the thread opener; these sit under it). */
export interface HighlightReplyView {
  id: number;
  author: PublicAuthor | null;
  body: string;
  createdAt: string;
}

// The demo viewer — same identity as the mock `me` (lib/api/client MOCK_ME), so a highlight the viewer
// creates comes back attributed to them (author.id === me.id), exactly as the real backend attributes
// it. That's what marks it "your own" for the always-paint rule (see highlight-clustering.ts).
const MOCK_VIEWER: PublicAuthor = { id: 1, username: "dohyun", bio: null, avatarUrl: null };
let mockHighlights: HighlightView[] = [];
let mockSeq = 5000;
// highlightId → its replies (demo mode).
const mockReplies = new Map<number, HighlightReplyView[]>();
let mockReplySeq = 7000;

/** Public — every attributed highlight on a post (Medium-style social highlights). */
export async function listHighlights(postId: number): Promise<HighlightView[]> {
  if (USE_MOCKS) return mockHighlights.map((h) => ({ ...h, replyCount: mockReplies.get(h.id)?.length ?? 0 }));
  const res = await fetch(`${API_BASE}/api/v1/public/posts/${postId}/highlights`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as HighlightView[];
}

/** Authenticated — every highlight the viewer has drawn, newest first, each with its source post
 *  (their private "내 서재"). */
export async function listMyHighlights(): Promise<MyHighlightItem[]> {
  if (USE_MOCKS) return mockMyHighlights();
  return request<MyHighlightItem[]>(`/api/v1/users/me/highlights`, { method: "GET" });
}

/**
 * Authenticated — "남들 하이라이트" 피드: 팔로우한 큐레이터가 최근 칠한 공개 구절(최신순, 페이지).
 * 팔로우가 0이거나 개인화 첫 페이지가 비면 백엔드가 전역 스트림으로 폴백하고 `source: "global"` 로
 * 알린다. 그때 이후 페이지는 `scope: "global"` 로 고정해 받아야 팔로잉↔전역 페이지가 섞이지 않는다
 * (page>0 빈 결과는 폴백 안 함 — 정상 끝). scope 미지정 시 백엔드가 폴백 규칙을 스스로 판단.
 */
export function getHighlightFeed(
  page = 0,
  size = 20,
  scope?: FeedSource,
): Promise<HighlightFeedPage> {
  if (USE_MOCKS) return Promise.resolve(mockHighlightFeed(page, size, scope));
  const scopeParam = scope === "global" ? "&scope=global" : "";
  return request<HighlightFeedPage>(
    `/api/v1/highlights/feed?page=${page}&size=${size}${scopeParam}`,
    { method: "GET" },
  );
}

/** Authenticated — create a highlight on a published post. */
export function createHighlight(postId: number, payload: NewHighlight): Promise<HighlightView> {
  if (USE_MOCKS) {
    const h: HighlightView = {
      id: ++mockSeq,
      author: MOCK_VIEWER,
      ...payload,
      note: payload.note?.trim() || null,
      replyCount: 0,
      createdAt: new Date().toISOString(),
    };
    mockHighlights = [...mockHighlights, h];
    return Promise.resolve(h);
  }
  return request<HighlightView>(`/api/v1/posts/${postId}/highlights`, {
    method: "POST",
    body: payload,
  });
}

/** Authenticated — remove the viewer's own highlight. */
export function deleteHighlight(id: number): Promise<void> {
  if (USE_MOCKS) {
    mockHighlights = mockHighlights.filter((h) => h.id !== id);
    mockReplies.delete(id);
    return Promise.resolve();
  }
  return request(`/api/v1/highlights/${id}`, { method: "DELETE" });
}

/** Public — the reply thread under a highlight (oldest first). */
export async function listHighlightReplies(highlightId: number): Promise<HighlightReplyView[]> {
  if (USE_MOCKS) return [...(mockReplies.get(highlightId) ?? [])];
  const res = await fetch(`${API_BASE}/api/v1/public/highlights/${highlightId}/replies`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as HighlightReplyView[];
}

/** Authenticated — reply to a highlight (notifies the highlight author + any @mentions). */
export function createHighlightReply(highlightId: number, body: string): Promise<HighlightReplyView> {
  if (USE_MOCKS) {
    const reply: HighlightReplyView = {
      id: ++mockReplySeq,
      author: MOCK_VIEWER,
      body,
      createdAt: new Date().toISOString(),
    };
    mockReplies.set(highlightId, [...(mockReplies.get(highlightId) ?? []), reply]);
    return Promise.resolve(reply);
  }
  return request<HighlightReplyView>(`/api/v1/highlights/${highlightId}/replies`, {
    method: "POST",
    body: { body },
  });
}

/** Authenticated — delete the viewer's own reply (or any, if post owner). */
export function deleteHighlightReply(id: number): Promise<void> {
  if (USE_MOCKS) {
    for (const [hid, replies] of mockReplies) {
      const next = replies.filter((r) => r.id !== id);
      if (next.length !== replies.length) mockReplies.set(hid, next);
    }
    return Promise.resolve();
  }
  return request(`/api/v1/highlight-replies/${id}`, { method: "DELETE" });
}
