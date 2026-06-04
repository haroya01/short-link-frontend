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
import type { SeriesDetailView, SeriesView } from "@/modules/blog/api/series";

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
const seriesPosts = new Map<number, number[]>(); // seriesId → ordered postIds
let seriesSeq = 8000;

(function seedSeries() {
  const s: SeriesView = {
    id: ++seriesSeq,
    slug: "mock-series",
    title: "로컬 예시 시리즈",
    postCount: 1,
    createdAt: nowIso(),
    updatedAt: null,
  };
  series.set(s.id, s);
  seriesPosts.set(s.id, []);
})();

const recount = (id: number): SeriesView => {
  const s = series.get(id)!;
  const next = { ...s, postCount: (seriesPosts.get(id) ?? []).length, updatedAt: nowIso() };
  series.set(id, next);
  return next;
};

export function mockListSeries(): SeriesView[] {
  return [...series.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function mockGetSeries(id: number): SeriesDetailView {
  const s = series.get(id) ?? { id, slug: `series-${id}`, title: "", postCount: 0, createdAt: nowIso(), updatedAt: null };
  const ids = seriesPosts.get(id) ?? [];
  return { series: s, posts: ids.map((pid) => mockGetPost(pid)) };
}

export function mockCreateSeries(payload: { slug: string; title: string }): SeriesDetailView {
  const id = ++seriesSeq;
  const s: SeriesView = { id, slug: payload.slug, title: payload.title, postCount: 0, createdAt: nowIso(), updatedAt: null };
  series.set(id, s);
  seriesPosts.set(id, []);
  return { series: s, posts: [] };
}

export function mockUpdateSeries(id: number, payload: { title: string; slug: string }): SeriesDetailView {
  const s = series.get(id);
  if (s) series.set(id, { ...s, title: payload.title, slug: payload.slug, updatedAt: nowIso() });
  return mockGetSeries(id);
}

export function mockSetSeriesPosts(id: number, postIds: number[]): SeriesDetailView {
  const prev = seriesPosts.get(id) ?? [];
  seriesPosts.set(id, [...postIds]);
  // Reflect membership on the posts themselves (the real backend owns post.seriesId / seriesOrder).
  // Dropped members lose their series; current members get this series id + their new order — so a
  // grouped "시리즈별" view that groups by post.seriesId stays correct after add/remove/reorder.
  prev.forEach((pid) => {
    const p = posts.get(pid);
    if (p && !postIds.includes(pid)) posts.set(pid, { ...p, seriesId: null, seriesOrder: null });
  });
  postIds.forEach((pid, i) => {
    const p = posts.get(pid);
    if (p) posts.set(pid, { ...p, seriesId: id, seriesOrder: i });
  });
  recount(id);
  return mockGetSeries(id);
}

export function mockDeleteSeries(id: number): void {
  series.delete(id);
  seriesPosts.delete(id);
}
