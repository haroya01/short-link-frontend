/**
 * Public Post API client — kurl content platform (U3 subdomain 모델). Server-side fetch 만 사용.
 * Cloudflare Worker 가 `{username}.kurl.me/...` 를 Vercel 로 proxy 하면, Next.js middleware 가
 * X-Original-Host 헤더에서 subdomain 추출 → `/p/[username]/...` 로 internal rewrite. 본 client 는
 * 그 페이지에서 backend 호출.
 */

import { cache } from "react";
import { blogMocks } from "@/modules/blog/api/_mock-gates";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";
import { fetchWithTimeout } from "@/lib/api/fetch-timeout";
import { freshToken, mockFailure, readToken } from "@/lib/api/client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

// ISR revalidate window. 작성자 발행/수정 후 visitors 가 30초 내 새 내용 봄.
// 백엔드도 어차피 캐시 없이 직접 조회라 backend 부하 큰 차이는 아님.
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

export interface PublicPostListItem {
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

/** A minimal reference to a series member post — for the card's "what's inside" preview. */
export interface SeriesPostRef {
  slug: string;
  title: string;
  /** Episode cover (OG image). Optional — when the backend supplies it the deck shows that episode's
   *  photo; absent → the card falls back to its theme-color cover. */
  ogImageUrl?: string | null;
}

/** A card's preview member — a post (slug) or a note (noteId, its excerpt as the title). */
export interface SeriesCardItem {
  type: SeriesItemType;
  slug: string | null;
  noteId: number | null;
  title: string;
  ogImageUrl: string | null;
}

/** A series as it appears on the discovery feed (cross-author series card). */
export interface PublicSeriesCard {
  /** Series id — the target for the subscribe toggle. */
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

export interface PublicFeedItem {
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

export async function fetchPublic<T>(
  path: string,
  opts?: { noStore?: boolean },
): Promise<FetchResult<T>> {
  const url = `${API_BASE}${path}`;
  const token = await viewerToken();
  // Detail lookups fetch with no-store: fetch can't cache only the 200 and skip the 404, so an ISR
  // window would serve a stale 404 on the publish→share path (a just-published post staying 404 for
  // up to the revalidate window). List/feed fetches stay on ISR — a momentarily missing card is far
  // cheaper than a broken shared link. The backend reads straight from the DB, so no-store here just
  // means one DB read per view.
  // try/catch: a thrown fetch (backend down, or the API unreachable while a STATIC feed page
  // prerenders at build) must degrade to the page's empty state — not 500 the render or fail the
  // build. ISR refills within REVALIDATE_SECONDS once the API answers again.
  try {
    const res = await fetchWithTimeout(
      url,
      token
        ? { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }
        : opts?.noStore
          ? { cache: "no-store" }
          : { next: { revalidate: REVALIDATE_SECONDS } },
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
    return Promise.resolve({ ok: true, data: blogMocks.mockFeedView({ sort, viewer: hasViewer() }) });
  }
  return fetchPublic<PublicFeedView>(
    `/api/v1/public/posts?sort=${sort}&page=${page}&size=${size}${langParam(lang)}`,
  );
}

/** `&lang=ko` when a language is selected; empty (all languages) otherwise. */
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
    return Promise.resolve({ ok: true, data: blogMocks.mockFeedView({ tag, sort, viewer: hasViewer() }) });
  }
  return fetchPublic<PublicFeedView>(
    `/api/v1/public/posts?tag=${encodeURIComponent(tag)}&sort=${sort}&page=${page}&size=${size}`,
  );
}

/** Free-text search across title / excerpt / tags / author handle. `sort` re-ranks the matches. */
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
      Promise.resolve({ ok: true, data: blogMocks.mockFeedView({ sort, q: query, viewer: hasViewer() }) })
    );
  return fetchPublic<PublicFeedView>(
    `/api/v1/public/posts?q=${encodeURIComponent(query)}&sort=${sort}&page=${page}&size=${size}${langParam(lang)}`,
  );
}

// cache() so the persistent author layout + the tab page share ONE request per render (the layout
// reads it for the header, the page for its posts).
export const listPublicPosts = cache(
  (username: string): Promise<FetchResult<PublicPostList>> => {
    if (blogMocks) return Promise.resolve({ ok: true, data: blogMocks.mockPostList(username) });
    return fetchPublic<PublicPostList>(
      `/api/v1/public/profiles/${encodeURIComponent(username)}/posts`,
    );
  },
);

// cache() so generateMetadata + the page component (+ opengraph-image) share ONE fetch per render.
// no-store opts out of Next's fetch memoization, so without this the reader page hits the backend
// twice per view; cache() dedupes within the render pass regardless of the fetch cache policy.
export const findPublicPost = cache(
  (username: string, slug: string): Promise<FetchResult<PublicPostDetail>> => {
    if (blogMocks)
      return Promise.resolve({ ok: true, data: blogMocks.mockPostDetail(username, slug) });
    return fetchPublic<PublicPostDetail>(
      `/api/v1/public/profiles/${encodeURIComponent(username)}/posts/${encodeURIComponent(slug)}`,
      { noStore: true },
    );
  },
);

/**
 * Reads a not-yet-public post by its share token (the owner's preview link). Bypasses the status
 * guard server-side; the token is the authorization, so no username/slug is needed. Always no-store.
 */
export const findPreviewPost = cache(
  (token: string): Promise<FetchResult<PublicPostDetail>> => {
    if (blogMocks)
      return Promise.resolve({ ok: true, data: blogMocks.mockPostDetail("me", "preview") });
    return fetchPublic<PublicPostDetail>(`/api/v1/public/preview/${encodeURIComponent(token)}`, {
      noStore: true,
    });
  },
);

export interface TagCount {
  tag: string;
  count: number;
}

/** Most-used tags across published posts, most popular first — the 주제 index. */
export function listPopularTags(limit = 50): Promise<FetchResult<TagCount[]>> {
  if (blogMocks)
    return Promise.resolve({ ok: true, data: blogMocks.MOCK_POPULAR_TAGS.slice(0, limit) });
  return fetchPublic<TagCount[]>(`/api/v1/public/tags?limit=${limit}`);
}

export interface SuggestedAuthor {
  author: PublicAuthor;
  postCount: number;
}

/** Authors ranked by published-post count — the discovery rail's 추천 작가 list. */
export function listSuggestedAuthors(limit = 5): Promise<FetchResult<SuggestedAuthor[]>> {
  if (blogMocks)
    return Promise.resolve({ ok: true, data: blogMocks.mockSuggestedAuthors(limit, hasViewer()) });
  return fetchPublic<SuggestedAuthor[]>(`/api/v1/public/authors?limit=${limit}`);
}

export interface TrendingTagSection {
  tag: string;
  postCount: number; // total published posts under the tag (for the "더보기" affordance)
  posts: PublicFeedItem[]; // top posts in the tag, most popular first
}

/**
 * Popular posts grouped by tag — backs the 인기 tab's "주제별 인기" sections (one horizontal row per
 * topic). `tagLimit` = how many topic rows; `perTag` = posts per row.
 */
export function listTrendingByTag(
  tagLimit = 6,
  perTag = 8,
): Promise<FetchResult<TrendingTagSection[]>> {
  if (blogMocks)
    return Promise.resolve({ ok: true, data: blogMocks.mockTrendingByTag(tagLimit, perTag) });
  return fetchPublic<TrendingTagSection[]>(
    `/api/v1/public/feed/trending-by-tag?tagLimit=${tagLimit}&perTag=${perTag}`,
  );
}

/** Cross-author active series for the feed's series cards — most recently active first. */
export function listDiscoverSeries(limit = 6): Promise<FetchResult<PublicSeriesCard[]>> {
  if (blogMocks) return Promise.resolve({ ok: true, data: blogMocks.mockDiscoverSeries(limit) });
  return fetchPublic<PublicSeriesCard[]>(`/api/v1/public/series?limit=${limit}`);
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
  // Mocks have no backend to scrape — return a believable rich preview so the card layout (image +
  // title + domain) is exercised in dev/storybook without a network call.
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
