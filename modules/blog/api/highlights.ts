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
  createdAt: string;
}

export interface NewHighlight {
  blockOrder: number;
  startOffset: number;
  endOffset: number;
  quote: string;
  note?: string | null;
}

const MOCK_VIEWER: PublicAuthor = { id: 9001, username: "reader", bio: null, avatarUrl: null };
let mockHighlights: HighlightView[] = [];
let mockSeq = 5000;

/** Public — every attributed highlight on a post (Medium-style social highlights). */
export async function listHighlights(postId: number): Promise<HighlightView[]> {
  if (USE_MOCKS) return [...mockHighlights];
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
    return Promise.resolve();
  }
  return request(`/api/v1/highlights/${id}`, { method: "DELETE" });
}
