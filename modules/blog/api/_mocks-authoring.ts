/**
 * In-memory authoring mocks (NEXT_PUBLIC_USE_MOCKS=1) — lets the whole write workspace (the editor,
 * 발행 글 / 임시저장 lists, publish/unpublish, blocks, image upload) run without a backend, so the
 * editor can be designed and exercised locally. Module-level state persists across the SPA session
 * (the workspace soft-navigates write/new → write/{id}); a full reload resets it, which is fine for a
 * demo. Mirrors the real posts.ts / post-images.ts contracts.
 */
import type {
  BlockInput,
  PostBlockView,
  PostRevisionView,
  PostStatus,
  PostView,
} from "@/modules/blog/api/posts";
import type { SeriesDetailView, SeriesItemRef, SeriesOwnerItem, SeriesView } from "@/modules/blog/api/series";
import { ApiError } from "@/lib/api/client";
import { mockSeriesNoteSummary } from "@/modules/notes/api/_mocks";

const nowIso = () => new Date().toISOString();

function blankPost(over: Partial<PostView>): PostView {
  return {
    id: 0,
    slug: "",
    title: "",
    status: "DRAFT",
    languageTag: "ko",
    publishedAt: null,
    scheduledAt: null,
    excerpt: null,
    ogImageUrl: null,
    viewCount: 0,
    likeCount: 0,
    tags: [],
    seriesId: null,
    seriesOrder: null,
    pinOrder: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...over,
  };
}

const toBlocks = (rows: [string, string | null][]): PostBlockView[] =>
  rows.map(([type, content], i) => ({ id: i + 1, type, content, blockOrder: i }));

const posts = new Map<number, PostView>();
const blocks = new Map<number, PostBlockView[]>();
let seq = 7000;

// Seed a published post + a draft so 발행 글 / 임시저장 / 큐레이션 lists aren't empty on first load.
(function seed() {
  const pub = blankPost({
    id: ++seq,
    slug: "mock-published-note",
    title: "로컬에서 쓴 발행 글",
    status: "PUBLISHED",
    publishedAt: nowIso(),
    excerpt: "mock 모드에서 에디터로 작성·발행한 예시 글.",
    tags: ["개발", "회고"],
    viewCount: 1284,
    likeCount: 62,
  });
  posts.set(pub.id, pub);
  blocks.set(
    pub.id,
    toBlocks([
      ["heading", "## 들어가며"],
      ["paragraph", "이 글은 mock 데이터로 렌더된 예시입니다. 편집해도 저장됩니다(이 세션 한정)."],
      ["paragraph", "발행/비공개/임시저장 전환도 동작합니다."],
    ]),
  );

  const draft = blankPost({
    id: ++seq,
    slug: "mock-draft",
    title: "작성 중인 초안",
    status: "DRAFT",
    tags: [],
  });
  posts.set(draft.id, draft);
  blocks.set(draft.id, toBlocks([["paragraph", "여기에 이어서 작성하세요…"]]));

  // A scheduled post so the write list can show the "발행 예정" instant on its own row.
  const scheduled = blankPost({
    id: ++seq,
    slug: "mock-scheduled",
    title: "예약해둔 다음 글",
    status: "SCHEDULED",
    scheduledAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    excerpt: "미래 시각에 자동 발행되도록 예약된 예시 글.",
    tags: ["공지"],
  });
  posts.set(scheduled.id, scheduled);
  blocks.set(scheduled.id, toBlocks([["paragraph", "발행 예정 시각이 되면 자동으로 공개됩니다."]]));
})();

function touch(id: number, patch: Partial<PostView>): PostView {
  const cur = posts.get(id) ?? blankPost({ id });
  const next = { ...cur, ...patch, updatedAt: nowIso() };
  posts.set(id, next);
  return next;
}

export function mockListMyPosts(): PostView[] {
  // Newest first, matching the backend's default ordering.
  return [...posts.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function mockGetPost(id: number): PostView {
  return posts.get(id) ?? blankPost({ id, slug: `post-${id}` });
}

export function mockCreatePost(payload: {
  slug: string;
  title: string;
  languageTag?: string;
}): PostView {
  const id = ++seq;
  const p = blankPost({
    id,
    slug: payload.slug,
    title: payload.title,
    languageTag: payload.languageTag ?? "ko",
  });
  posts.set(id, p);
  blocks.set(id, []);
  return p;
}

export function mockUpdatePostMetadata(
  id: number,
  payload: {
    title?: string;
    slug?: string;
    excerpt?: string;
    ogImageUrl?: string;
    languageTag?: string;
    tags?: string[];
  },
): PostView {
  if (payload.slug !== undefined) {
    if (payload.slug.length < 2) throw new ApiError(400, { status: 400, detail: "slug length 2~200" });
    if ([...posts.values()].some((p) => p.id !== id && p.slug === payload.slug)) {
      throw new ApiError(409, { status: 409, code: "SLUG_CONFLICT" });
    }
  }
  const patch: Partial<PostView> = {};
  if (payload.title !== undefined) patch.title = payload.title;
  if (payload.slug !== undefined) patch.slug = payload.slug;
  if (payload.excerpt !== undefined) patch.excerpt = payload.excerpt;
  if (payload.ogImageUrl !== undefined) patch.ogImageUrl = payload.ogImageUrl;
  if (payload.languageTag !== undefined) patch.languageTag = payload.languageTag;
  if (payload.tags !== undefined) patch.tags = payload.tags;
  return touch(id, patch);
}

export function mockDeletePost(id: number): void {
  posts.delete(id);
  blocks.delete(id);
}

export function mockSetStatus(id: number, status: PostStatus, scheduledAt?: string): PostView {
  return touch(id, {
    status,
    publishedAt: status === "PUBLISHED" ? posts.get(id)?.publishedAt ?? nowIso() : posts.get(id)?.publishedAt ?? null,
    scheduledAt: status === "SCHEDULED" ? scheduledAt ?? null : null,
  });
}

/** Replace the pinned set (ordered ids → pinOrder = index). Only PUBLISHED posts pin; others clear —
 *  mirrors the backend's SetPinnedPostsUseCase so the 글 목록 toggle + 대표글 strip behave like prod. */
export function mockSetPins(orderedIds: number[]): void {
  for (const p of posts.values()) {
    if (p.status !== "PUBLISHED") continue;
    const idx = orderedIds.indexOf(p.id);
    posts.set(p.id, { ...p, pinOrder: idx >= 0 ? idx : null });
  }
}

export function mockListRevisions(_id: number): PostRevisionView[] {
  return [];
}

export function mockGetBlocks(id: number): PostBlockView[] {
  return blocks.get(id) ?? [];
}

export function mockReplaceBlocks(id: number, input: BlockInput[]): PostBlockView[] {
  const next = input.map((b, i) => ({ id: i + 1, type: b.type, content: b.content, blockOrder: i }));
  blocks.set(id, next);
  return next;
}

// ── Series (authoring) ──────────────────────────────────────────────────────
const series = new Map<number, SeriesView>();
const seriesItems = new Map<number, SeriesItemRef[]>(); // seriesId → ordered posts and notes
let seriesSeq = 8000;
const MOCK_AUTHOR_ID = 1;

(function seedSeries() {
  const s: SeriesView = {
    id: ++seriesSeq,
    slug: "mock-series",
    title: "로컬 예시 시리즈",
    postCount: 0,
    itemCount: 0,
    createdAt: nowIso(),
    updatedAt: null,
  };
  series.set(s.id, s);
  seriesItems.set(s.id, []);

  const mixed: SeriesView = {
    id: ++seriesSeq,
    slug: "refactoring-diary",
    title: "리팩터링 일지",
    postCount: 1,
    itemCount: 2,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    updatedAt: null,
  };
  series.set(mixed.id, mixed);
  const published = [...posts.values()].find((p) => p.status === "PUBLISHED")!;
  posts.set(published.id, { ...published, seriesId: mixed.id, seriesOrder: 0 });
  seriesItems.set(mixed.id, [
    { type: "POST", id: published.id },
    { type: "NOTE", id: 40 },
  ]);
})();

const postIdsOf = (id: number) =>
  (seriesItems.get(id) ?? []).filter((ref) => ref.type === "POST").map((ref) => ref.id);

const recount = (id: number): SeriesView => {
  const s = series.get(id)!;
  const refs = seriesItems.get(id) ?? [];
  const next = { ...s, postCount: postIdsOf(id).length, itemCount: refs.length, updatedAt: nowIso() };
  series.set(id, next);
  return next;
};

export function mockListSeries(): SeriesView[] {
  return [...series.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function mockGetSeries(id: number): SeriesDetailView {
  const s = series.get(id) ?? { id, slug: `series-${id}`, title: "", postCount: 0, createdAt: nowIso(), updatedAt: null };
  const items = (seriesItems.get(id) ?? []).flatMap<SeriesOwnerItem>((ref) => {
    if (ref.type === "POST") return [{ type: "POST", post: mockGetPost(ref.id), note: null }];
    const found = mockSeriesNoteSummary(ref.id);
    return found ? [{ type: "NOTE", post: null, note: found.summary }] : [];
  });
  return { series: s, posts: postIdsOf(id).map((pid) => mockGetPost(pid)), items };
}

export function mockCreateSeries(payload: { slug: string; title: string }): SeriesDetailView {
  const id = ++seriesSeq;
  const s: SeriesView = { id, slug: payload.slug, title: payload.title, postCount: 0, itemCount: 0, createdAt: nowIso(), updatedAt: null };
  series.set(id, s);
  seriesItems.set(id, []);
  return { series: s, posts: [], items: [] };
}

export function mockUpdateSeries(id: number, payload: { title: string; slug: string }): SeriesDetailView {
  const s = series.get(id);
  if (s) series.set(id, { ...s, title: payload.title, slug: payload.slug, updatedAt: nowIso() });
  return mockGetSeries(id);
}

function syncPostMembership(id: number) {
  const ids = postIdsOf(id);
  for (const p of posts.values()) {
    const idx = ids.indexOf(p.id);
    if (idx >= 0) posts.set(p.id, { ...p, seriesId: id, seriesOrder: idx });
    else if (p.seriesId === id) posts.set(p.id, { ...p, seriesId: null, seriesOrder: null });
  }
}

/** The old endpoint refills the post slots in order and leaves notes where they stand. */
export function mockSetSeriesPosts(id: number, postIds: number[]): SeriesDetailView {
  const queue = [...postIds];
  const next: SeriesItemRef[] = [];
  for (const ref of seriesItems.get(id) ?? []) {
    if (ref.type === "NOTE") next.push(ref);
    else if (queue.length > 0) next.push({ type: "POST", id: queue.shift()! });
  }
  seriesItems.set(id, [...next, ...queue.map((pid) => ({ type: "POST" as const, id: pid }))]);
  syncPostMembership(id);
  recount(id);
  return mockGetSeries(id);
}

export function mockSetSeriesItems(id: number, items: SeriesItemRef[]): Promise<SeriesDetailView> {
  for (const ref of items) {
    if (ref.type !== "NOTE") continue;
    const found = mockSeriesNoteSummary(ref.id);
    if (!found) return Promise.reject(new ApiError(404, { status: 404, code: "SERIES_NOTE_NOT_FOUND" }));
    if (found.authorId !== MOCK_AUTHOR_ID) {
      return Promise.reject(new ApiError(403, { status: 403, code: "PERMISSION_DENIED" }));
    }
    if (found.visibility === "private" || found.visibility === "direct") {
      return Promise.reject(new ApiError(409, { status: 409, code: "SERIES_NOTE_NOT_SHARED" }));
    }
  }
  const same = (a: SeriesItemRef) => (b: SeriesItemRef) => a.type === b.type && a.id === b.id;
  for (const [other, refs] of seriesItems) {
    if (other === id) continue;
    const kept = refs.filter((ref) => !items.some(same(ref)));
    if (kept.length !== refs.length) {
      seriesItems.set(other, kept);
      syncPostMembership(other);
      recount(other);
    }
  }
  seriesItems.set(id, items.map((ref) => ({ type: ref.type, id: ref.id })));
  syncPostMembership(id);
  recount(id);
  return Promise.resolve(mockGetSeries(id));
}

export function mockDeleteSeries(id: number): void {
  series.delete(id);
  seriesItems.delete(id);
}
