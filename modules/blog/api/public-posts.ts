/**
 * Public Post API client — kurl content platform (U3 subdomain 모델). Server-side fetch 만 사용.
 * Cloudflare Worker 가 `{username}.kurl.me/...` 를 Vercel 로 proxy 하면, Next.js middleware 가
 * X-Original-Host 헤더에서 subdomain 추출 → `/p/[username]/...` 로 internal rewrite. 본 client 는
 * 그 페이지에서 backend 호출.
 */

import { cache } from "react";
import {
  USE_MOCKS,
  mockFeedView,
  mockPostDetail,
  mockPostList,
  mockDiscoverSeries,
  mockSeriesDetail,
  mockSeriesList,
  mockTrendingByTag,
  MOCK_POPULAR_TAGS,
  MOCK_SUGGESTED_AUTHORS,
} from "@/modules/blog/api/_mocks";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

// ISR revalidate window. 작성자 발행/수정 후 visitors 가 30초 내 새 내용 봄.
// 백엔드도 어차피 캐시 없이 직접 조회라 backend 부하 큰 차이는 아님.
const REVALIDATE_SECONDS = 30;

export interface PublicAuthor {
  id: number;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
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

export interface PublicPostSeriesNav {
  slug: string;
  title: string;
  position: number;
  total: number;
  prev: PublicSeriesNavLink | null;
  next: PublicSeriesNavLink | null;
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
  postCount: number;
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
}

/** A series as it appears on the discovery feed (cross-author series card). */
export interface PublicSeriesCard {
  /** Series id — the target for the subscribe toggle. */
  id: number;
  author: PublicAuthor;
  slug: string;
  title: string;
  postCount: number;
  lastPublishedAt: string;
  /** First few published members (in series order) — the card's mini table of contents. */
  posts: SeriesPostRef[];
}

export interface PublicSeriesDetail {
  author: PublicAuthor;
  series: PublicSeriesListItem;
  posts: PublicPostListItem[];
}

export interface PublicFeedItem {
  /** Post id — lets feed cards call post-scoped actions (bookmark/like) without opening the post. */
  id: number;
  author: PublicAuthor;
  slug: string;
  title: string;
  excerpt: string | null;
  ogImageUrl: string | null;
  languageTag: string;
  tags: string[];
  publishedAt: string;
  viewCount: number;
  likeCount: number;
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

async function fetchPublic<T>(
  path: string,
  opts?: { noStore?: boolean },
): Promise<FetchResult<T>> {
  const url = `${API_BASE}${path}`;
  // Detail lookups fetch with no-store: fetch can't cache only the 200 and skip the 404, so an ISR
  // window would serve a stale 404 on the publish→share path (a just-published post staying 404 for
  // up to the revalidate window). List/feed fetches stay on ISR — a momentarily missing card is far
  // cheaper than a broken shared link. The backend reads straight from the DB, so no-store here just
  // means one DB read per view.
  const res = await fetch(
    url,
    opts?.noStore ? { cache: "no-store" } : { next: { revalidate: REVALIDATE_SECONDS } },
  );
  if (res.status === 200) {
    const data = (await res.json()) as T;
    return { ok: true, data };
  }
  if (res.status === 404) return { ok: false, status: 404 };
  if (res.status === 410) return { ok: false, status: 410 };
  return { ok: false, status: "error" };
}

export function listPublicFeed(
  sort: FeedSort = "recent",
  page = 0,
  size = 20,
): Promise<FetchResult<PublicFeedView>> {
  if (USE_MOCKS) return Promise.resolve({ ok: true, data: mockFeedView({ sort }) });
  return fetchPublic<PublicFeedView>(
    `/api/v1/public/posts?sort=${sort}&page=${page}&size=${size}`,
  );
}

export function listFeedByTag(
  tag: string,
  sort: FeedSort = "recent",
  page = 0,
  size = 24,
): Promise<FetchResult<PublicFeedView>> {
  if (USE_MOCKS) return Promise.resolve({ ok: true, data: mockFeedView({ tag, sort }) });
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
): Promise<FetchResult<PublicFeedView>> {
  if (USE_MOCKS) return Promise.resolve({ ok: true, data: mockFeedView({ sort, q: query }) });
  return fetchPublic<PublicFeedView>(
    `/api/v1/public/posts?q=${encodeURIComponent(query)}&sort=${sort}&page=${page}&size=${size}`,
  );
}

// cache() so the persistent author layout + the tab page share ONE request per render (the layout
// reads it for the header, the page for its posts).
export const listPublicPosts = cache(
  (username: string): Promise<FetchResult<PublicPostList>> => {
    if (USE_MOCKS) return Promise.resolve({ ok: true, data: mockPostList(username) });
    return fetchPublic<PublicPostList>(
      `/api/v1/public/profiles/${encodeURIComponent(username)}/posts`,
    );
  },
);

export function findPublicPost(
  username: string,
  slug: string,
): Promise<FetchResult<PublicPostDetail>> {
  if (USE_MOCKS) return Promise.resolve({ ok: true, data: mockPostDetail(username, slug) });
  return fetchPublic<PublicPostDetail>(
    `/api/v1/public/profiles/${encodeURIComponent(username)}/posts/${encodeURIComponent(slug)}`,
    { noStore: true },
  );
}

/**
 * Reads a not-yet-public post by its share token (the owner's preview link). Bypasses the status
 * guard server-side; the token is the authorization, so no username/slug is needed. Always no-store.
 */
export function findPreviewPost(token: string): Promise<FetchResult<PublicPostDetail>> {
  if (USE_MOCKS) return Promise.resolve({ ok: true, data: mockPostDetail("me", "preview") });
  return fetchPublic<PublicPostDetail>(
    `/api/v1/public/preview/${encodeURIComponent(token)}`,
    { noStore: true },
  );
}

export interface TagCount {
  tag: string;
  count: number;
}

/** Most-used tags across published posts, most popular first — the 주제 index. */
export function listPopularTags(limit = 50): Promise<FetchResult<TagCount[]>> {
  if (USE_MOCKS) return Promise.resolve({ ok: true, data: MOCK_POPULAR_TAGS.slice(0, limit) });
  return fetchPublic<TagCount[]>(`/api/v1/public/tags?limit=${limit}`);
}

export interface SuggestedAuthor {
  author: PublicAuthor;
  postCount: number;
}

/** Authors ranked by published-post count — the discovery rail's 추천 작가 list. */
export function listSuggestedAuthors(limit = 5): Promise<FetchResult<SuggestedAuthor[]>> {
  if (USE_MOCKS)
    return Promise.resolve({ ok: true, data: MOCK_SUGGESTED_AUTHORS.slice(0, limit) });
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
  if (USE_MOCKS)
    return Promise.resolve({ ok: true, data: mockTrendingByTag(tagLimit, perTag) });
  return fetchPublic<TrendingTagSection[]>(
    `/api/v1/public/feed/trending-by-tag?tagLimit=${tagLimit}&perTag=${perTag}`,
  );
}

/** Cross-author active series for the feed's series cards — most recently active first. */
export function listDiscoverSeries(limit = 6): Promise<FetchResult<PublicSeriesCard[]>> {
  if (USE_MOCKS) return Promise.resolve({ ok: true, data: mockDiscoverSeries(limit) });
  return fetchPublic<PublicSeriesCard[]>(`/api/v1/public/series?limit=${limit}`);
}

export function listPublicSeries(username: string): Promise<FetchResult<PublicSeriesList>> {
  if (USE_MOCKS) return Promise.resolve({ ok: true, data: mockSeriesList(username) });
  return fetchPublic<PublicSeriesList>(
    `/api/v1/public/profiles/${encodeURIComponent(username)}/series`,
  );
}

export function findPublicSeries(
  username: string,
  slug: string,
): Promise<FetchResult<PublicSeriesDetail>> {
  if (USE_MOCKS) return Promise.resolve({ ok: true, data: mockSeriesDetail(username, slug) });
  return fetchPublic<PublicSeriesDetail>(
    `/api/v1/public/profiles/${encodeURIComponent(username)}/series/${encodeURIComponent(slug)}`,
    { noStore: true },
  );
}

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
