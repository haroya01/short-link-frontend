import { request } from "@/lib/api/client";
import { USE_MOCKS } from "@/modules/blog/api/_mocks";

/** One entry in the reader's history — the post + its author + when it was last read. */
export interface ReadingHistoryEntry {
  postId: number;
  username: string;
  avatarUrl: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  ogImageUrl: string | null;
  readAt: string;
}

export interface ReadingHistoryPage {
  items: ReadingHistoryEntry[];
  page: number;
  size: number;
  hasNext: boolean;
}

let mockHistory: ReadingHistoryEntry[] = [
  {
    postId: 8001,
    username: "haneul",
    avatarUrl: null,
    title: "좋은 글쓰기의 조건",
    slug: "good-writing",
    excerpt: "문장은 짧게, 생각은 깊게.",
    ogImageUrl: null,
    readAt: new Date().toISOString(),
  },
];

/**
 * Fire-and-forget read beacon — records the post in the signed-in reader's history. Silent on
 * failure (a history beacon must never disrupt reading). No-op in mock mode.
 */
export function recordRead(postId: number): void {
  if (USE_MOCKS) return;
  void request(`/api/v1/posts/${postId}/read`, { method: "POST" }).catch(() => {});
}

/** Authenticated — the reader's history, most recently read first (paged). */
export function listReadingHistory(page = 0): Promise<ReadingHistoryPage> {
  if (USE_MOCKS) return Promise.resolve({ items: mockHistory, page, size: 20, hasNext: false });
  return request<ReadingHistoryPage>(`/api/v1/users/me/reading-history?page=${page}&size=20`, {
    method: "GET",
  });
}

/** Clear the whole reading history. */
export function clearReadingHistory(): Promise<void> {
  if (USE_MOCKS) {
    mockHistory = [];
    return Promise.resolve();
  }
  return request("/api/v1/users/me/reading-history", { method: "DELETE" });
}

/** Forget a single post from the history. */
export function forgetRead(postId: number): Promise<void> {
  if (USE_MOCKS) {
    mockHistory = mockHistory.filter((h) => h.postId !== postId);
    return Promise.resolve();
  }
  return request(`/api/v1/users/me/reading-history/${postId}`, { method: "DELETE" });
}
