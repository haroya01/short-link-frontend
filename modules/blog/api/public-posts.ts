import { cache } from "react";
import { blogMocks } from "@/modules/blog/api/_mock-gates";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";
import { fetchWithTimeout } from "@/lib/api/fetch-timeout";
import { freshToken, mockEmpty, mockFailure, readToken } from "@/lib/api/client";
import { redactCard, type AudienceFields } from "@/modules/blog/lib/post-audience";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

const REVALIDATE_SECONDS = 30;

export interface PublicAuthor {
  id: number;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  displayName?: string | null;
  /** Whether this user also has a public link-in-bio profile (u/{username}). Optional — absent until
   *  the backend supplies it, so the cross-link to the profile stays hidden rather than 404-ing. */
  hasLinkInBio?: boolean;
}

export interface PostOwnerFields {
  hasPassword?: boolean;
  unlistedUrl?: string | null;
  blockedCountries?: string[];
}

export interface PublicPostListItem extends AudienceFields, PostOwnerFields {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  ogImageUrl: string | null;
  languageTag: string;
  tags: string[];
  likeCount: number;
  publishedAt: string; // ISO instant
  /** Last meaningful edit (ISO instant), or null if never edited since publish. The reader shows a
   *  "수정 {date}" hint only when this falls on a later day than publishedAt — see the post page. */
  lastEditedAt: string | null;
  /** Author-pinned 대표글 — surfaces in the blog's 대표글 section, ordered before 최근 글. */
  pinned: boolean;
}

export interface PublicSeriesNavLink {
  slug: string;
  title: string;
}

export type SeriesItemType = "POST" | "NOTE";

/** A series neighbour that may be a post (slug) or a note (noteId). A note's title is its excerpt —
 *  or its content warning when it carries one. */
export interface SeriesItemLink {
  type: SeriesItemType;
  slug: string | null;
  noteId: number | null;
  title: string;
}

export interface PublicPostSeriesNav {
  slug: string;
  title: string;
  /** Published posts only. */
  position: number;
  total: number;
  prev: PublicSeriesNavLink | null;
  next: PublicSeriesNavLink | null;
  /** Posts and readable notes in series order. Absent from servers that predate notes in series. */
  itemPosition?: number;
  itemTotal?: number;
  prevItem?: SeriesItemLink | null;
  nextItem?: SeriesItemLink | null;
}

export interface SeriesNoteSummary {
  id: number;
  body: string;
  contentWarning: string | null;
  excerpt: string | null;
  createdAt: string;
}

export interface PublicSeriesItem {
  type: SeriesItemType;
  post: PublicPostListItem | null;
  note: SeriesNoteSummary | null;
}

export interface PublicCtaInfo {
  label: string;
  url: string;
  style: string;
  purpose: string;
  deleted: boolean;
}

export interface PublicPostBlock {
  type: string;
  content: string | null;
  blockOrder: number;
  cta: PublicCtaInfo | null;
}

export interface PublicPostList {
  author: PublicAuthor;
  posts: PublicPostListItem[];
}

export interface PublicPostDetail {
  author: PublicAuthor;
  post: PublicPostListItem;
  blocks: PublicPostBlock[];
  series: PublicPostSeriesNav | null;
}

export interface PublicSeriesListItem {
  /** Series id — the subscribe toggle's target (the series page's 구독), like the discovery card. */
  id: number;
  slug: string;
  title: string;
  /** Published posts only; a series of notes alone lists with 0. */
  postCount: number;
  itemCount?: number;
  /** Distinct tags across the series' member posts — backs the series index's tag filter. Optional:
   *  absent until the backend aggregates it, so the filter rail simply hides rather than mis-filtering
   *  (treated as "no tags" everywhere it's read). */
  tags?: string[];
}

export interface PublicSeriesList {
  author: PublicAuthor;
  series: PublicSeriesListItem[];
}

export interface SeriesPostRef {
  slug: string;
  title: string;
  /** Episode cover (OG image). Optional — when the backend supplies it the deck shows that episode's
   *  photo; absent → the card falls back to its theme-color cover. */
  ogImageUrl?: string | null;
}

export interface SeriesCardItem {
  type: SeriesItemType;
  slug: string | null;
  noteId: number | null;
  title: string;
  ogImageUrl: string | null;
}

export interface PublicSeriesCard {
  id: number;
  author: PublicAuthor;
  slug: string;
  title: string;
  postCount: number;
  itemCount?: number;
  lastPublishedAt: string;
  /** First few published members (in series order) — the card's mini table of contents. */
  posts: SeriesPostRef[];
  /** First few members, posts and notes mixed in series order. */
  items?: SeriesCardItem[];
}

export interface PublicSeriesDetail {
  author: PublicAuthor;
  series: PublicSeriesListItem;
  /** Published posts only. */
  posts: PublicPostListItem[];
  /** Posts and readable notes in series order. */
  items?: PublicSeriesItem[];
}

export interface PublicFeedItem extends AudienceFields {
  /** Post id — lets feed cards call post-scoped actions (bookmark/like) without opening the post. */
  id: number;
  author: PublicAuthor;
  slug: string;
  title: string;
  excerpt: string | null;
  ogImageUrl: string | null;
  /** Feed-row thumbnail: the cover only when the author chose it, else null. Absent on older servers. */
  thumbnailUrl?: string | null;
  languageTag: string;
  tags: string[];
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  /**
   * Why this post is in the viewer's 팔로잉 feed — only set there (null elsewhere). kind: AUTHOR
   * (follow the author) · SERIES (subscribe to its series) · TOPIC (follow a tag it carries); `tag`
   * names the matched tag for TOPIC.
   */
  followReason?: FollowReason | null;
  series?: FeedSeriesRef | null;
}

export interface FeedSeriesRef {
  slug: string;
  title: string;
  postCount: number;
}

export interface FollowReason {
  kind: "AUTHOR" | "SERIES" | "TOPIC";
  tag: string | null;
}

export interface PublicFeedView {
  items: PublicFeedItem[];
  page: number;
  size: number;
  hasNext: boolean;
}

export type FeedSort = "recent" | "trending";

export type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 404 | 410 | "error" };

// A signed-in reader's discovery lists are their own: given the token, the server leaves out authors
// they blocked or muted and authors who blocked them. Only the browser holds the token, so server
// renders stay anonymous ISR and a cached page never carries one reader's list.
function viewerToken(): Promise<string | null> {
  return typeof window === "undefined" ? Promise.resolve(null) : freshToken();
}

export function hasViewer(): boolean {
  return typeof window !== "undefined" && !!readToken();
}

export async function viewerHeaders(): Promise<HeadersInit | undefined> {
  const token = await viewerToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export const AUTHOR_POSTS_TAG = (username: string) => `author-posts:${username.toLowerCase()}`;
export const PUBLIC_POSTS_TAG = "public-posts";

export async function fetchPublic<T>(
  path: string,
  opts?: { noStore?: boolean; tags?: string[]; headers?: Record<string, string> },
): Promise<FetchResult<T>> {
  const url = `${API_BASE}${path}`;
  const token = await viewerToken();
  const extra = opts?.headers ?? {};
  // Detail lookups are no-store: fetch can't cache the 200 without also caching a 404, which would
  // keep a just-published post 404 for a whole revalidate window. A thrown fetch (API down, or
  // unreachable while a static page prerenders at build) must degrade to the empty state.
  try {
    const own = Object.keys(extra).length > 0 ? { headers: extra } : {};
    const res = await fetchWithTimeout(
      url,
      token
        ? { cache: "no-store", headers: { ...extra, Authorization: `Bearer ${token}` } }
        : opts?.noStore
          ? { cache: "no-store", ...own }
          : { next: { revalidate: REVALIDATE_SECONDS, ...(opts?.tags ? { tags: opts.tags } : {}) }, ...own },
    );
    if (res.status === 200) {
      const data = (await res.json()) as T;
      return { ok: true, data };
    }
    if (res.status === 404) return { ok: false, status: 404 };
    if (res.status === 410) return { ok: false, status: 410 };
    return { ok: false, status: "error" };
  } catch {
    return { ok: false, status: "error" };
  }
}

export function listPublicFeed(
  sort: FeedSort = "recent",
  page = 0,
  size = 20,
  lang?: string,
): Promise<FetchResult<PublicFeedView>> {
  if (blogMocks) {
    return Promise.resolve({ ok: true, data: redactFeedView(blogMocks.mockFeedView({ sort, viewer: hasViewer() })) });
  }
  return fetchPublic<PublicFeedView>(
    `/api/v1/public/posts?sort=${sort}&page=${page}&size=${size}${langParam(lang)}`,
    { tags: [PUBLIC_POSTS_TAG] },
  ).then(redactFeedResult);
}

function redactFeedView(view: PublicFeedView): PublicFeedView {
  return { ...view, items: view.items.map(redactCard) };
}

function redactFeedResult(result: FetchResult<PublicFeedView>): FetchResult<PublicFeedView> {
  return result.ok ? { ok: true, data: redactFeedView(result.data) } : result;
}

function langParam(lang?: string): string {
  return lang ? `&lang=${encodeURIComponent(lang)}` : "";
}

export function listFeedByTag(
  tag: string,
  sort: FeedSort = "recent",
  page = 0,
  size = 24,
): Promise<FetchResult<PublicFeedView>> {
  if (blogMocks) {
    return Promise.resolve({ ok: true, data: redactFeedView(blogMocks.mockFeedView({ tag, sort, viewer: hasViewer() })) });
  }
  return fetchPublic<PublicFeedView>(
    `/api/v1/public/posts?tag=${encodeURIComponent(tag)}&sort=${sort}&page=${page}&size=${size}`,
    { tags: [PUBLIC_POSTS_TAG] },
  ).then(redactFeedResult);
}

export function searchPublicFeed(
  query: string,
  sort: FeedSort = "recent",
  page = 0,
  size = 24,
  lang?: string,
): Promise<FetchResult<PublicFeedView>> {
  if (blogMocks)
    return (
      mockFailure("search") ??
      Promise.resolve({ ok: true, data: redactFeedView(blogMocks.mockFeedView({ sort, q: query, viewer: hasViewer() })) })
    );
  return fetchPublic<PublicFeedView>(
    `/api/v1/public/posts?q=${encodeURIComponent(query)}&sort=${sort}&page=${page}&size=${size}${langParam(lang)}`,
    { tags: [PUBLIC_POSTS_TAG] },
  ).then(redactFeedResult);
}

// cache() so the persistent author layout + the tab page share ONE request per render (the layout
// reads it for the header, the page for its posts).
export const listPublicPosts = cache(
  (username: string): Promise<FetchResult<PublicPostList>> => {
    if (blogMocks) return Promise.resolve({ ok: true, data: redactPostList(blogMocks.mockPostList(username)) });
    return fetchPublic<PublicPostList>(
      `/api/v1/public/profiles/${encodeURIComponent(username)}/posts`,
      { tags: [AUTHOR_POSTS_TAG(username), PUBLIC_POSTS_TAG] },
    ).then((result) => (result.ok ? { ok: true, data: redactPostList(result.data) } : result));
  },
);

function redactPostList(list: PublicPostList): PublicPostList {
  return { ...list, posts: list.posts.map(redactCard) };
}

// cache() so generateMetadata + the page component (+ opengraph-image) share ONE fetch per render.
// no-store opts out of Next's fetch memoization, so without this the reader page hits the backend
// twice per view; cache() dedupes within the render pass regardless of the fetch cache policy.
export const findPublicPost = cache(
  (username: string, slug: string, key?: string | null): Promise<FetchResult<PublicPostDetail>> => {
    if (blogMocks) {
      const data = blogMocks.mockPostDetail(username, slug, { viewer: false, key, render: "server" });
      return Promise.resolve(data ? { ok: true, data } : { ok: false, status: 404 });
    }
    return fetchPublic<PublicPostDetail>(postDetailPath(username, slug), {
      noStore: true,
      headers: key ? { "X-Post-Key": key } : undefined,
    });
  },
);

function postDetailPath(username: string, slug: string): string {
  return `/api/v1/public/profiles/${encodeURIComponent(username)}/posts/${encodeURIComponent(slug)}`;
}

export type PostDetailRead =
  | { ok: true; data: PublicPostDetail }
  | { ok: false; status: 404 | 410 | "error" };

export async function readPostDetail(
  username: string,
  slug: string,
  access: { key?: string | null; grant?: string | null },
): Promise<PostDetailRead> {
  if (blogMocks) {
    const data = blogMocks.mockPostDetail(username, slug, {
      viewer: hasViewer(),
      key: access.key,
      grant: access.grant,
      render: "browser",
    });
    return data ? { ok: true, data } : { ok: false, status: 404 };
  }
  const headers: Record<string, string> = {};
  if (access.key) headers["X-Post-Key"] = access.key;
  if (access.grant) headers["X-Post-Grant"] = access.grant;
  return fetchPublic<PublicPostDetail>(postDetailPath(username, slug), { noStore: true, headers });
}

export type UnlockResult =
  | { ok: true; grant: string; expiresAt: string }
  | { ok: false; reason: "invalid" | "attempts" | "region" | "error"; retryAfter?: number };

export async function unlockPost(username: string, slug: string, password: string): Promise<UnlockResult> {
  if (blogMocks) return blogMocks.mockUnlockPost(username, slug, password);
  try {
    const res = await fetchWithTimeout(`${API_BASE}${postDetailPath(username, slug)}/unlock`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.status === 200) {
      const body = (await res.json()) as { grant: string; expiresAt: string };
      return { ok: true, grant: body.grant, expiresAt: body.expiresAt };
    }
    if (res.status === 401) return { ok: false, reason: "invalid" };
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After"));
      return { ok: false, reason: "attempts", ...(Number.isFinite(retryAfter) && retryAfter > 0 ? { retryAfter } : {}) };
    }
    if (res.status === 403) return { ok: false, reason: "region" };
    return { ok: false, reason: "error" };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/**
 * Reads a not-yet-public post by its share token (the owner's preview link). Bypasses the status
 * guard server-side; the token is the authorization, so no username/slug is needed. Always no-store.
 */
export const findPreviewPost = cache(
  (token: string): Promise<FetchResult<PublicPostDetail>> => {
    if (blogMocks) {
      const data = blogMocks.mockPostDetail("me", "preview", { viewer: false, render: "server" });
      return Promise.resolve(data ? { ok: true, data } : { ok: false, status: 404 });
    }
    return fetchPublic<PublicPostDetail>(`/api/v1/public/preview/${encodeURIComponent(token)}`, {
      noStore: true,
    });
  },
);

export interface TagCount {
  tag: string;
  count: number;
}

export interface RelatedTag {
  tag: string;
  posts: number;
  notes: number;
}

/** Empty, also from a server without the endpoint, means show nothing. */
export async function listRelatedTags(query: string, limit = 8): Promise<RelatedTag[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  if (blogMocks) return mockEmpty("related") ? [] : blogMocks.mockRelatedTags(q, limit);
  const result = await fetchPublic<{ tags?: RelatedTag[] }>(
    `/api/v1/public/search/related?q=${encodeURIComponent(q)}&limit=${limit}`,
  );
  return result.ok ? (result.data.tags ?? []) : [];
}

export function listPopularTags(limit = 50): Promise<FetchResult<TagCount[]>> {
  if (blogMocks)
    return Promise.resolve({ ok: true, data: blogMocks.MOCK_POPULAR_TAGS.slice(0, limit) });
  return fetchPublic<TagCount[]>(`/api/v1/public/tags?limit=${limit}`);
}

export interface SuggestedAuthor {
  author: PublicAuthor;
  postCount: number;
}

export function listSuggestedAuthors(limit = 5): Promise<FetchResult<SuggestedAuthor[]>> {
  if (blogMocks)
    return Promise.resolve({ ok: true, data: blogMocks.mockSuggestedAuthors(limit, hasViewer()) });
  return fetchPublic<SuggestedAuthor[]>(`/api/v1/public/authors?limit=${limit}`);
}

export function listPublicSeries(username: string): Promise<FetchResult<PublicSeriesList>> {
  if (blogMocks) return Promise.resolve({ ok: true, data: blogMocks.mockSeriesList(username) });
  return fetchPublic<PublicSeriesList>(
    `/api/v1/public/profiles/${encodeURIComponent(username)}/series`,
  );
}

export const findPublicSeries = cache(
  (username: string, slug: string): Promise<FetchResult<PublicSeriesDetail>> => {
    if (blogMocks)
      return Promise.resolve({ ok: true, data: blogMocks.mockSeriesDetail(username, slug) });
    return fetchPublic<PublicSeriesDetail>(
      `/api/v1/public/profiles/${encodeURIComponent(username)}/series/${encodeURIComponent(slug)}`,
      { noStore: true },
    );
  },
);

/** Link-preview (unfurl) for a URL embedded in a post — og:title/description/image, or nulls when
 *  the target has no Open Graph (the card then falls back to a bare domain row). */
export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
}

export function getLinkPreview(url: string): Promise<FetchResult<LinkPreview>> {
  if (USE_MOCKS) {
    let host = url;
    try {
      host = new URL(url).host.replace(/^www\./, "");
    } catch {
      /* keep raw */
    }
    return Promise.resolve({
      ok: true,
      data: {
        url,
        title: `${host} — 링크 미리보기`,
        description: "이 링크의 Open Graph 설명이 여기에 표시됩니다.",
        image: `https://picsum.photos/seed/${encodeURIComponent(host)}/480/252`,
      },
    });
  }
  return fetchPublic<LinkPreview>(`/api/v1/public/link-preview?url=${encodeURIComponent(url)}`);
}
