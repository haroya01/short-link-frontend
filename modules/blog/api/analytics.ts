import { request } from "@/lib/api/client";
import type { ProfileStats } from "@/types";

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
  /** Follows this post drove ("이 글로 늘어난 팔로우"). */
  followsGained: number;
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
  lifetimeFollows: number;
  windowFollows: number;
  daily: DailyPoint[];
  topPosts: TopPost[];
}

/** Clicks one in-post kurl link drove — the per-link breakdown of "이 글이 만든 클릭". */
export interface PostLinkClick {
  shortCode: string;
  destinationUrl: string;
  clicks: number;
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
  lifetimeFollows: number;
  windowFollows: number;
  daily: DailyPoint[];
  /** Per-link click breakdown (most-clicked first), empty when the post has no kurl links. */
  linkBreakdown: PostLinkClick[];
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

/**
 * Deep per-post read stats — the same dimensional breakdown as the profile-visit dashboard
 * (countries · devices · browsers · referrers · channels · UTM · hour heatmap · daily), but scoped
 * to ONE post's reads. Reuses the ProfileStats shape so {@link ProfileStatsDashboard} renders it
 * directly. Backend endpoint to be added: {@code GET /api/v1/posts/{id}/stats} (clicks already carry
 * post_id — see backend V73 migration). Mock-backed until then.
 */
export function getPostStats(id: number, days = 30): Promise<ProfileStats> {
  if (USE_MOCKS) return Promise.resolve(mockDeepStats(id, days));
  return request<ProfileStats>(`/api/v1/posts/${id}/stats?days=${days}`, { method: "GET" });
}

/** Deep per-series read stats — the post breakdown aggregated across a series' member posts. Backend
 *  endpoint to be added: {@code GET /api/v1/series/{id}/stats}. Mock-backed until then. */
export function getSeriesStats(id: number, days = 30): Promise<ProfileStats> {
  if (USE_MOCKS) return Promise.resolve(mockDeepStats(id * 1000, days, 2.4));
  return request<ProfileStats>(`/api/v1/series/${id}/stats?days=${days}`, { method: "GET" });
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
  { postId: 1, slug: "nextjs-14-app-router-blog", title: "Next.js 14 App Router로 블로그를 다시 만든 이유", viewCount: 1284, likeCount: 62, followsGained: 34 },
  { postId: 2, slug: "spring-boot-tx-propagation", title: "Spring Boot 트랜잭션 전파, 다시 정리", viewCount: 903, likeCount: 39, followsGained: 21 },
  { postId: 3, slug: "naming-is-hard", title: "리팩터링: 이름 짓기에 하루를 쓰는 이유", viewCount: 612, likeCount: 44, followsGained: 12 },
  { postId: 4, slug: "side-project-pricing", title: "1인 개발자의 가격 정책 실험", viewCount: 428, likeCount: 88, followsGained: 29 },
  { postId: 5, slug: "coffee-routine", title: "커피 한 잔의 루틴, 생산성에 대하여", viewCount: 211, likeCount: 25, followsGained: 4 },
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
    lifetimeFollows: MOCK_TOP.reduce((s, p) => s + p.followsGained, 0),
    windowFollows: 18,
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
    lifetimeFollows: top.followsGained,
    windowFollows: Math.max(1, Math.round(top.followsGained * 0.3)),
    daily,
    linkBreakdown: [
      { shortCode: "kurl-a1", destinationUrl: "https://github.com/haroya01/short-link", clicks: Math.round(top.viewCount * 0.22) },
      { shortCode: "kurl-b2", destinationUrl: "https://nextjs.org/docs", clicks: Math.round(top.viewCount * 0.11) },
      { shortCode: "kurl-c3", destinationUrl: "https://docs.spring.io/spring-boot", clicks: Math.round(top.viewCount * 0.05) },
    ],
  };
}

/** ProfileStats-shaped deep breakdown for a post/series, seeded so each id renders distinct data. */
function mockDeepStats(seed: number, days: number, mult = 1): ProfileStats {
  const k = (n: number) => Math.round(n * mult * (0.7 + ((seed % 7) + 1) / 10));
  const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  const dailyVisits = mockDaily(days, seed + 5).map((d) => ({ date: d.date, count: k(d.views + 8) }));
  const hourVisits = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: k(12 + 60 * Math.abs(Math.sin((h - 3 + (seed % 5)) * 0.4))),
  }));
  const heatmap: { dayOfWeek: string; hour: number; count: number }[] = [];
  for (const day of DAYS) {
    const weekend = day === "SATURDAY" || day === "SUNDAY" ? 0.5 : 1;
    for (let h = 0; h < 24; h++) {
      const c = k(Math.max(0, 18 * Math.sin((h + (seed % 4)) * 0.42) * weekend));
      if (c > 0) heatmap.push({ dayOfWeek: day, hour: h, count: c });
    }
  }
  const human = k(1800);
  const bot = k(160);
  return {
    timezone: "Asia/Seoul",
    totalVisits: human + bot,
    humanVisits: human,
    botVisits: bot,
    uniqueVisits: k(1240),
    firstVisitAt: "2026-05-01T08:12:00Z",
    lastVisitAt: "2026-06-04T21:40:00Z",
    peakHour: 21,
    dailyVisits,
    hourVisits,
    heatmap,
    countryVisits: [
      { country: "KR", count: k(1180) },
      { country: "JP", count: k(420) },
      { country: "US", count: k(160) },
      { country: "DE", count: k(60) },
    ],
    deviceVisits: [
      { device: "mobile", count: k(1120) },
      { device: "desktop", count: k(620) },
      { device: "tablet", count: k(90) },
    ],
    browserVisits: [
      { browser: "Chrome", count: k(1040) },
      { browser: "Safari", count: k(600) },
      { browser: "Edge", count: k(140) },
    ],
    referrerHostVisits: [
      { host: "", count: k(820) },
      { host: "google.com", count: k(560) },
      { host: "x.com", count: k(260) },
    ],
    sourceChannelVisits: [
      { source: "organic", count: k(760) },
      { source: "direct", count: k(560) },
      { source: "social", count: k(480) },
    ],
    utmCampaignVisits: [{ campaign: "launch", count: k(120) }],
    utmSourceVisits: [
      { source: "twitter", count: k(100) },
      { source: "instagram", count: k(70) },
    ],
  };
}
