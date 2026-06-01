import { request } from "@/lib/api/client";

/** Author analytics — mirrors the backend PostAnalyticsController DTOs. */
export interface DailyPoint {
  date: string; // ISO yyyy-mm-dd (UTC day)
  views: number;
}

export interface TopPost {
  postId: number;
  slug: string;
  title: string;
  viewCount: number;
  likeCount: number;
}

export interface AuthorAnalyticsOverview {
  totalPosts: number;
  publishedPosts: number;
  lifetimeViews: number;
  lifetimeLikes: number;
  windowDays: number;
  windowViews: number;
  lifetimeLinkClicks: number;
  windowLinkClicks: number;
  daily: DailyPoint[];
  topPosts: TopPost[];
}

export interface PostAnalytics {
  postId: number;
  slug: string;
  title: string;
  status: string;
  lifetimeViews: number;
  lifetimeLikes: number;
  windowDays: number;
  windowViews: number;
  lifetimeLinkClicks: number;
  windowLinkClicks: number;
  daily: DailyPoint[];
}

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

export function getAuthorAnalyticsOverview(days = 30): Promise<AuthorAnalyticsOverview> {
  if (USE_MOCKS) return Promise.resolve(mockOverview(days));
  return request<AuthorAnalyticsOverview>(`/api/v1/posts/analytics/overview?days=${days}`, {
    method: "GET",
  });
}

export function getPostAnalytics(id: number, days = 30): Promise<PostAnalytics> {
  if (USE_MOCKS) return Promise.resolve(mockPostAnalytics(id, days));
  return request<PostAnalytics>(`/api/v1/posts/${id}/analytics?days=${days}`, { method: "GET" });
}

// ---- mocks (NEXT_PUBLIC_USE_MOCKS=1) — deterministic so screenshots/dev are stable ----

function mockDaily(days: number, seed: number): DailyPoint[] {
  const out: DailyPoint[] = [];
  const today = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today - i * 86_400_000);
    const wave = Math.abs(Math.sin((i + seed) * 1.27)) * 38;
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6 ? 0.45 : 1;
    out.push({ date: d.toISOString().slice(0, 10), views: Math.round(wave * weekend) });
  }
  return out;
}

const MOCK_TOP: TopPost[] = [
  { postId: 1, slug: "nextjs-14-app-router-blog", title: "Next.js 14 App Router로 블로그를 다시 만든 이유", viewCount: 1284, likeCount: 62 },
  { postId: 2, slug: "spring-boot-tx-propagation", title: "Spring Boot 트랜잭션 전파, 다시 정리", viewCount: 903, likeCount: 39 },
  { postId: 3, slug: "naming-is-hard", title: "리팩터링: 이름 짓기에 하루를 쓰는 이유", viewCount: 612, likeCount: 44 },
  { postId: 4, slug: "side-project-pricing", title: "1인 개발자의 가격 정책 실험", viewCount: 428, likeCount: 88 },
  { postId: 5, slug: "coffee-routine", title: "커피 한 잔의 루틴, 생산성에 대하여", viewCount: 211, likeCount: 25 },
];

function mockOverview(days: number): AuthorAnalyticsOverview {
  const daily = mockDaily(days, 3);
  return {
    totalPosts: 8,
    publishedPosts: 5,
    lifetimeViews: MOCK_TOP.reduce((s, p) => s + p.viewCount, 0),
    lifetimeLikes: MOCK_TOP.reduce((s, p) => s + p.likeCount, 0),
    windowDays: days,
    windowViews: daily.reduce((s, p) => s + p.views, 0),
    lifetimeLinkClicks: 742,
    windowLinkClicks: Math.round(daily.reduce((s, p) => s + p.views, 0) * 0.18),
    daily,
    topPosts: MOCK_TOP,
  };
}

function mockPostAnalytics(id: number, days: number): PostAnalytics {
  const top = MOCK_TOP.find((p) => p.postId === id) ?? MOCK_TOP[0];
  const daily = mockDaily(days, id + 1);
  return {
    postId: top.postId,
    slug: top.slug,
    title: top.title,
    status: "PUBLISHED",
    lifetimeViews: top.viewCount,
    lifetimeLikes: top.likeCount,
    windowDays: days,
    windowViews: daily.reduce((s, p) => s + p.views, 0),
    lifetimeLinkClicks: Math.round(top.viewCount * 0.4),
    windowLinkClicks: Math.round(daily.reduce((s, p) => s + p.views, 0) * 0.2),
    daily,
  };
}
