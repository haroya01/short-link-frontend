import { request } from "@/lib/api/client";
import { USE_MOCKS } from "@/modules/blog/api/_mocks";

/**
 * Blog-wide operational metrics for the admin overview — distinct from the apex links-product admin
 * (infra/redirect perf) and from per-author analytics (one author's own posts). This is the
 * cross-author rollup: how much the blog as a whole is read, how many authors are active, and the
 * top posts across everyone. Backend: `GET /api/v1/admin/blog/metrics` (not yet implemented — the
 * mock below renders the page in demo/preview until the endpoint lands).
 */
export interface BlogTopPost {
  id: number;
  title: string;
  authorHandle: string;
  reads: number;
  /** Canonical public URL — lets the admin jump straight to the post. */
  url: string | null;
}

export interface BlogAdminMetrics {
  /** Lifetime published-post count across all authors. */
  totalPosts: number;
  /** Lifetime reads (post views) across all authors. */
  totalReads: number;
  /** Authors who published or were read in the last 30 days. */
  activeAuthors: number;
  /** Unresolved abuse reports (OPEN + REVIEWING) — mirrors the moderation queue backlog. */
  openReports: number;
  /** Most-read posts across all authors, highest first. */
  topPosts: BlogTopPost[];
}

const MOCK: BlogAdminMetrics = {
  totalPosts: 1284,
  totalReads: 392184,
  activeAuthors: 73,
  openReports: 4,
  topPosts: [
    { id: 101, title: "RSC 전환기 — 우리가 버린 것들", authorHandle: "dohyun", reads: 18422, url: null },
    { id: 102, title: "사이드프로젝트를 6개월 굴려보고", authorHandle: "minji", reads: 12090, url: null },
    { id: 103, title: "QR 캠페인 A/B 30일 회고", authorHandle: "kazuki", reads: 9311, url: null },
    { id: 104, title: "디자인 시스템 다크모드 마이그레이션", authorHandle: "sora", reads: 7740, url: null },
    { id: 105, title: "블로그 SEO, 6개월간 한 것 전부", authorHandle: "jiwoo", reads: 6128, url: null },
  ],
};

export async function getBlogAdminMetrics(): Promise<BlogAdminMetrics> {
  if (USE_MOCKS) return Promise.resolve(MOCK);
  return request<BlogAdminMetrics>("/api/v1/admin/blog/metrics", { method: "GET" });
}
