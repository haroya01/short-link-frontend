/**
 * Links-product mock layer (NEXT_PUBLIC_USE_MOCKS=1). The blog product mocks at its own API functions
 * (modules/blog/api/_mocks.ts) and short-circuits before `request()`; the links product calls
 * `request()` directly, so this resolver answers known links GET endpoints with valid (often empty)
 * data — enough for the links app screens to render their real state instead of an "Internal Server
 * Error" data-error (which blocked them from the all-screens lived-render suite).
 *
 * Scope: the read endpoints the main app screens load (dashboard · campaigns · ctas · stats · settings).
 * Returns `undefined` for anything not mocked → the caller falls through to the real fetch. Add a case
 * here as more links screens get covered. Mostly GET; the one mutation is the publish-time shorten.
 */
let mockShortenSeq = 7000;

export function mockLinksResponse(path: string, method: string): unknown | undefined {
  const verb = (method || "GET").toUpperCase();
  const p = path.split("?")[0].replace(/\/+$/, "");

  // Shorten — the blog publish flow auto-shortens in-post links. Return a valid kurl short link so
  // the rewrite recognizes it (kurlShortCode) and the flow is exercisable without a backend.
  if (verb === "POST" && p === "/api/v1/links") {
    const host = process.env.NEXT_PUBLIC_KURL_HOST ?? "kurl.me";
    const code = (++mockShortenSeq).toString(36).padStart(4, "0");
    return { shortCode: code, shortUrl: `https://${host}/${code}`, claimToken: null };
  }

  if (verb !== "GET") return undefined;

  switch (p) {
    // Dashboard — the viewer's links (paged) + their tags.
    case "/api/v1/links/me":
      return { items: [], nextCursor: null, hasMore: false };
    case "/api/v1/tags":
      return [];
    // Campaigns / CTAs / QR campaigns lists.
    case "/api/v1/campaigns":
      return [];
    case "/api/v1/ctas":
      return [];
    // Weekly insights (dashboard/stats summary) — zeroed but well-formed.
    case "/api/v1/users/me/insights/week":
      return { clicks: 0, links: 0, topLinks: [], byDay: [] };
    // Owner profile visit stats (방문자/readers + /u/<user>/stats) — a populated ProfileStats so the
    // dashboard renders its full chart breakdown (the page errored without this, blocking dark-mode QA).
    case "/api/v1/users/me/profile/stats":
      return mockProfileStats();
    default:
      return undefined;
  }
}

function mockProfileStats(): unknown {
  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  const base = new Date();
  const dailyVisits = Array.from({ length: 30 }, (_, idx) => {
    const i = 29 - idx;
    const d = new Date(base.getTime() - i * 86_400_000);
    return { date: d.toISOString().slice(0, 10), count: Math.round(60 + 50 * Math.abs(Math.sin(i * 0.7))) };
  });
  const hourVisits = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: Math.round(20 + 80 * Math.abs(Math.sin((h - 3) * 0.4))),
  }));
  const heatmap: { dayOfWeek: string; hour: number; count: number }[] = [];
  for (const day of days) {
    const weekend = day === "SATURDAY" || day === "SUNDAY" ? 0.5 : 1;
    for (let h = 0; h < 24; h++) {
      const c = Math.round(Math.max(0, 28 * Math.sin(h * 0.42) * weekend));
      if (c > 0) heatmap.push({ dayOfWeek: day, hour: h, count: c });
    }
  }
  return {
    timezone: "Asia/Seoul",
    totalVisits: 3120,
    humanVisits: 2840,
    botVisits: 280,
    uniqueVisits: 1990,
    firstVisitAt: "2026-05-01T08:12:00Z",
    lastVisitAt: "2026-06-04T21:40:00Z",
    peakHour: 21,
    dailyVisits,
    hourVisits,
    heatmap,
    countryVisits: [
      { country: "KR", count: 1840 },
      { country: "JP", count: 610 },
      { country: "US", count: 240 },
      { country: "DE", count: 90 },
      { country: "GB", count: 60 },
    ],
    deviceVisits: [
      { device: "mobile", count: 1720 },
      { device: "desktop", count: 980 },
      { device: "tablet", count: 140 },
    ],
    browserVisits: [
      { browser: "Chrome", count: 1610 },
      { browser: "Safari", count: 920 },
      { browser: "Edge", count: 210 },
      { browser: "Firefox", count: 100 },
    ],
    referrerHostVisits: [
      { host: "", count: 1230 },
      { host: "google.com", count: 880 },
      { host: "x.com", count: 420 },
      { host: "naver.com", count: 310 },
    ],
    sourceChannelVisits: [
      { source: "organic", count: 1200 },
      { source: "direct", count: 880 },
      { source: "social", count: 760 },
    ],
    utmCampaignVisits: [
      { campaign: "launch", count: 180 },
      { campaign: "newsletter", count: 90 },
    ],
    utmSourceVisits: [
      { source: "twitter", count: 160 },
      { source: "instagram", count: 110 },
    ],
  };
}
