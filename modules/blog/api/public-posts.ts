/**
 * Public Post API client — kurl content platform (U3 subdomain 모델). Server-side fetch 만 사용.
 * Cloudflare Worker 가 `{username}.kurl.me/...` 를 Vercel 로 proxy 하면, Next.js middleware 가
 * X-Original-Host 헤더에서 subdomain 추출 → `/p/[username]/...` 로 internal rewrite. 본 client 는
 * 그 페이지에서 backend 호출.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

// ISR revalidate window. 작성자 발행/수정 후 visitors 가 30초 내 새 내용 봄.
// 백엔드도 어차피 캐시 없이 직접 조회라 backend 부하 큰 차이는 아님.
const REVALIDATE_SECONDS = 30;

export interface PublicAuthor {
  id: number;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
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
  slug: string;
  title: string;
  postCount: number;
}

export interface PublicSeriesList {
  author: PublicAuthor;
  series: PublicSeriesListItem[];
}

export interface PublicSeriesDetail {
  author: PublicAuthor;
  series: PublicSeriesListItem;
  posts: PublicPostListItem[];
}

export interface PublicFeedItem {
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
  return fetchPublic<PublicFeedView>(
    `/api/v1/public/posts?sort=${sort}&page=${page}&size=${size}`,
  );
}

export function listFeedByTag(
  tag: string,
  page = 0,
  size = 24,
): Promise<FetchResult<PublicFeedView>> {
  return fetchPublic<PublicFeedView>(
    `/api/v1/public/posts?tag=${encodeURIComponent(tag)}&page=${page}&size=${size}`,
  );
}

/** Free-text search across title / excerpt / tags / author handle. `sort` re-ranks the matches. */
export function searchPublicFeed(
  query: string,
  sort: FeedSort = "recent",
  page = 0,
  size = 24,
): Promise<FetchResult<PublicFeedView>> {
  return fetchPublic<PublicFeedView>(
    `/api/v1/public/posts?q=${encodeURIComponent(query)}&sort=${sort}&page=${page}&size=${size}`,
  );
}

export function listPublicPosts(username: string): Promise<FetchResult<PublicPostList>> {
  return fetchPublic<PublicPostList>(
    `/api/v1/public/profiles/${encodeURIComponent(username)}/posts`,
  );
}

export function findPublicPost(
  username: string,
  slug: string,
): Promise<FetchResult<PublicPostDetail>> {
  return fetchPublic<PublicPostDetail>(
    `/api/v1/public/profiles/${encodeURIComponent(username)}/posts/${encodeURIComponent(slug)}`,
    { noStore: true },
  );
}

export interface TagCount {
  tag: string;
  count: number;
}

/** Most-used tags across published posts, most popular first — the 주제 index. */
export function listPopularTags(limit = 50): Promise<FetchResult<TagCount[]>> {
  return fetchPublic<TagCount[]>(`/api/v1/public/tags?limit=${limit}`);
}

export interface SuggestedAuthor {
  author: PublicAuthor;
  postCount: number;
}

/** Authors ranked by published-post count — the discovery rail's 추천 작가 list. */
export function listSuggestedAuthors(limit = 5): Promise<FetchResult<SuggestedAuthor[]>> {
  return fetchPublic<SuggestedAuthor[]>(`/api/v1/public/authors?limit=${limit}`);
}

export function listPublicSeries(username: string): Promise<FetchResult<PublicSeriesList>> {
  return fetchPublic<PublicSeriesList>(
    `/api/v1/public/profiles/${encodeURIComponent(username)}/series`,
  );
}

export function findPublicSeries(
  username: string,
  slug: string,
): Promise<FetchResult<PublicSeriesDetail>> {
  return fetchPublic<PublicSeriesDetail>(
    `/api/v1/public/profiles/${encodeURIComponent(username)}/series/${encodeURIComponent(slug)}`,
    { noStore: true },
  );
}
