/**
 * Curation — FRONT-END-ONLY MOCK. There is no backend for this yet; pins and bookmarks live in
 * localStorage so the curation UX actually works (add / reorder / remove persist across reloads)
 * while the API is unbuilt. When a real endpoint lands, swap the bodies below for `request(...)`
 * calls — the call sites in the page don't change. CJK seed copy is fine here (mock data, same as
 * analytics.ts; the i18n literal guard scans app/components/hooks/lib, not modules).
 */

export interface BookmarkItem {
  id: number;
  username: string;
  title: string;
  slug: string;
}

const PIN_KEY = "kurl:curation:pins"; // number[] of postIds, in display order
const BOOKMARK_KEY = "kurl:curation:bookmarks"; // BookmarkItem[]

// Seeded once so the reading list isn't empty on first open. Mock authors/posts.
const SEED_BOOKMARKS: BookmarkItem[] = [
  { id: 9001, username: "kim", title: "서브도메인 멀티테넌시, 도메인부터 다시 설계한 기록", slug: "subdomain-multitenancy" },
  { id: 9002, username: "lee", title: "RAG 실전: 검색 품질을 끌어올린 일곱 가지", slug: "rag-in-production" },
  { id: 9003, username: "park", title: "예약 발행을 자동화한 스케줄러 이야기", slug: "scheduled-publish-job" },
];

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / private-mode failures — curation is a soft preference
  }
}

/** Pinned post ids in display order (the order they'd surface atop the public blog home). */
export function getPinnedIds(): number[] {
  return read<number[]>(PIN_KEY, []);
}

export function setPinnedIds(ids: number[]): void {
  write(PIN_KEY, ids);
}

export function getBookmarks(): BookmarkItem[] {
  // First open → seed, so the curation panel demonstrates the shape instead of rendering empty.
  // Only the panel calls this; the post-page toggle uses the raw helpers below so a brand-new
  // reader who bookmarks one post gets exactly that post, not the seed demo set.
  if (typeof window !== "undefined" && window.localStorage.getItem(BOOKMARK_KEY) === null) {
    write(BOOKMARK_KEY, SEED_BOOKMARKS);
    return SEED_BOOKMARKS;
  }
  return read<BookmarkItem[]>(BOOKMARK_KEY, SEED_BOOKMARKS);
}

export function isBookmarked(id: number): boolean {
  return read<BookmarkItem[]>(BOOKMARK_KEY, []).some((b) => b.id === id);
}

/** Save a post to the reading list (idempotent, newest first). Returns the updated list. */
export function addBookmark(item: BookmarkItem): BookmarkItem[] {
  const cur = read<BookmarkItem[]>(BOOKMARK_KEY, []);
  if (cur.some((b) => b.id === item.id)) return cur;
  const next = [item, ...cur];
  write(BOOKMARK_KEY, next);
  return next;
}

export function removeBookmark(id: number): BookmarkItem[] {
  const next = read<BookmarkItem[]>(BOOKMARK_KEY, []).filter((b) => b.id !== id);
  write(BOOKMARK_KEY, next);
  return next;
}
