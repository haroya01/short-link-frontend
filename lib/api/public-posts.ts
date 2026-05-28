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
  username: string;
  bio: string | null;
  avatarUrl: string | null;
}

export interface PublicPostListItem {
  slug: string;
  title: string;
  excerpt: string | null;
  ogImageUrl: string | null;
  languageTag: string;
  publishedAt: string; // ISO instant
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
}

export type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 404 | 410 | "error" };

async function fetchPublic<T>(path: string): Promise<FetchResult<T>> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (res.status === 200) {
    const data = (await res.json()) as T;
    return { ok: true, data };
  }
  if (res.status === 404) return { ok: false, status: 404 };
  if (res.status === 410) return { ok: false, status: 410 };
  return { ok: false, status: "error" };
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
  );
}
