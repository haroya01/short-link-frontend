import { expect, test } from "@playwright/test";

/**
 * End-to-end coverage for the per-link admin metrics panel. The real admin page is gated by
 * cookie auth so we don't have a logged-in admin in CI — instead we exercise the network
 * surface (api smoke) and the rendering by stubbing every admin endpoint with route
 * fulfilment, then driving the page with a stub `kurl_token` cookie that the auth client
 * trusts in non-prod.
 */

const ADMIN_OVERVIEW = {
  totals: { users: 12, links: 5, clicks: 42 },
  newUsers7d: 0,
  newLinks7d: 0,
  clicks7d: 0,
  anonymousLinkRatio: 0,
  expiredLinkRatio: 0,
  clicklessLinkRatio: 0,
  dailySignups: [],
  dailyLinks: [],
  dailyClicks: [],
  topUsersByLinks: [],
  topUsersByClicks: [],
  topLinksByClicks: [],
};

const ADMIN_HEALTH = {
  httpLatency: { p50Millis: 1, p95Millis: 2, p99Millis: 3 },
  httpStatusCounts: { "200": 10 },
  rateLimitExceeded: 0,
  safeBrowsingMalicious: 0,
  authFailures: 0,
  dbPool: {},
  cache: {},
  redirect: {
    p50Millis: 5,
    p95Millis: 12,
    p99Millis: 25,
    total: 100,
    notFound: 2,
    expired: 1,
    previews: 0,
    viewLimit: 0,
    passwordRequired: 0,
    errors: 0,
  },
};

const LINK_METRICS = [
  {
    shortCode: "hotlink",
    originalUrl: "https://hot.example.com/a-long-path-that-should-truncate-in-the-table",
    userId: 1,
    ownerEmail: "owner@example.com",
    totalRedirects: 9876,
    windowedRedirects: 1234,
    p50Millis: 12,
    p95Millis: 45,
    p99Millis: 102,
    errorRate: 0.08,
    outcomeCounts: { redirect: 1100, not_found: 100, blocked: 34 },
    lastRedirectAt: new Date().toISOString(),
  },
  {
    shortCode: "calm00",
    originalUrl: "https://calm.example.com",
    userId: 2,
    ownerEmail: "calm@example.com",
    totalRedirects: 50,
    windowedRedirects: 10,
    p50Millis: 5,
    p95Millis: 15,
    p99Millis: 22,
    errorRate: 0,
    outcomeCounts: { redirect: 10 },
    lastRedirectAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  },
];

test.describe("admin per-link metrics panel", () => {
  test("anonymous users are blocked from the admin endpoint", async ({ request }) => {
    const res = await request.get("/api/v1/admin/link-metrics");
    expect(res.status()).toBe(401);
  });

  test.describe("rendered panel", () => {
    test.beforeEach(async ({ page, context }) => {
      // Inject a JWT-shaped admin claim — the dev profile bypasses signature verification when
      // SHORT_LINK_BOOTSTRAP_ADMIN_EMAIL matches, so we settle for a UI-only mock here.
      await context.addCookies([
        {
          name: "kurl_token",
          value: "stub-admin-token",
          domain: "localhost",
          path: "/",
        },
      ]);
      await page.route("**/api/v1/users/me**", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: 1,
            email: "admin@example.com",
            role: "ADMIN",
            createdAt: new Date().toISOString(),
            apiKeyCount: 0,
            twofaEnabled: false,
          }),
        }),
      );
      await page.route("**/api/v1/admin/overview**", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(ADMIN_OVERVIEW),
        }),
      );
      await page.route("**/api/v1/admin/health-metrics**", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(ADMIN_HEALTH),
        }),
      );
      await page.route("**/api/v1/admin/route-metrics**", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
      );
      await page.route("**/api/v1/admin/recent-errors**", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
      );
      await page.route("**/api/v1/admin/cohort**", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ weeks: 8, rows: [] }),
        }),
      );
      await page.route("**/api/v1/admin/lifecycle**", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ maxDay: 30, days: [] }),
        }),
      );
      await page.route("**/api/v1/admin/active-users**", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ period: "day", buckets: [] }),
        }),
      );
      await page.route("**/api/v1/admin/link-metrics**", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(LINK_METRICS),
        }),
      );
    });

    test("renders link metrics table with hot row, window chip switch, and outcome drill-down", async ({
      page,
    }) => {
      await page.goto("/ko/admin");

      // The section heading from the ko message bundle
      const section = page.getByRole("heading", { name: "링크별 성능" });
      await expect(section).toBeVisible();

      // Both seeded short codes should land in the table
      const rows = page.locator('[data-testid="link-metric-row"]');
      await expect(rows).toHaveCount(2);
      await expect(page.getByText("/hotlink")).toBeVisible();
      await expect(page.getByText("/calm00")).toBeVisible();

      // hotlink has errorRate=0.08 which is above 5% threshold -> warning chip
      await expect(
        page.locator('[data-testid="link-metric-high-error"]').first(),
      ).toBeVisible();

      // Switch to 7d window — the request is re-issued; we just assert chip activation
      await page.click('[data-testid="link-metrics-window-7d"]');
      await expect(page.locator('[data-testid="link-metrics-window-7d"]')).toHaveClass(
        /bg-slate-900/,
      );

      // Switch backend sort hint to latency
      await page.click('[data-testid="link-metrics-sort-latency"]');
      await expect(page.locator('[data-testid="link-metrics-sort-latency"]')).toHaveClass(
        /bg-slate-900/,
      );

      // Drill-down: click the toggle on the first row, outcome pills appear
      const firstToggle = page.locator('[data-testid="link-metric-toggle"]').first();
      await firstToggle.click();
      await expect(page.locator('[data-testid="link-metric-outcomes"]').first()).toBeVisible();
      await expect(
        page.locator('[data-testid="outcome-pill-redirect"]').first(),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="outcome-pill-not_found"]').first(),
      ).toBeVisible();
    });
  });
});
