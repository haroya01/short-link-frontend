import { request } from "@/lib/api/client";
import { USE_MOCKS } from "@/modules/blog/api/_mocks";
import type { PublicAuthor } from "./public-posts";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/** A public, attributed reader highlight — who highlighted which span (block + char offsets + quote),
 *  with an optional public memo (the curator's margin note shown alongside the highlight). */
export interface HighlightView {
  id: number;
  author: PublicAuthor | null;
  blockOrder: number;
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
  startOffset: number;
  endOffset: number;
  quote: string;
  note?: string | null;
}

/** One reply in a highlight's thread (the author's note is the thread opener; these sit under it). */
export interface HighlightReplyView {
  id: number;
  author: PublicAuthor | null;
  body: string;
  createdAt: string;
}

const MOCK_VIEWER: PublicAuthor = { id: 9001, username: "reader", bio: null, avatarUrl: null };
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
