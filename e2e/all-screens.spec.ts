import { test, expect, type Page } from "@playwright/test";

/**
 * Tier-2 "lived render" safety net across EVERY frontend surface — marketing, link-in-bio, the links
 * app, and the blog workspace. Product-agnostic + deterministic (no pixel baselines): a screen that
 * throws (error boundary), renders blank, collapses its layout, or drops its heading/main landmark
 * fails loudly. This is the broad sweep; richer per-screen assertions live in blog-screens.spec.ts.
 *
 * mock-ON lane: the in-memory mock provides an auto-authenticated session, so the auth-gated
 * workspace/app pages render their real content (not the login wall).
 */
test.use({ viewport: { width: 1280, height: 900 } });

async function rendersCleanly(page: Page, name: string) {
  await expect(page.locator("body")).toBeVisible();
  // No framework error boundary surfaced.
  await expect(
    page.getByText(/Application error|client-side exception|Internal Server Error|Unhandled Runtime/i),
  ).toHaveCount(0);
  // Real laid-out content (not a blank/collapsed shell).
  const height = await page.evaluate(() => document.body.scrollHeight);
  expect(height, `${name}: laid-out content (not collapsed)`).toBeGreaterThan(300);
  // The page rendered its own structure, not just shared chrome.
  const hasStructure = await page.evaluate(
    () => !!document.querySelector("h1, h2, main, [role='main'], article, [data-testid='editor-toolbar']"),
  );
  expect(hasStructure, `${name}: has a heading / main landmark`).toBe(true);
}

// Canonical served URLs (the /links/* paths 308-redirect to these apex routes).
const SCREENS: { name: string; path: string }[] = [
  // ── marketing (public) ──
  { name: "marketing · pricing", path: "/ko/pricing" },
  { name: "marketing · about", path: "/ko/about" },
  { name: "marketing · learn", path: "/ko/learn" },
  { name: "marketing · privacy", path: "/ko/privacy" },
  { name: "marketing · terms", path: "/ko/terms" },
  { name: "marketing · login", path: "/ko/login" },
  { name: "marketing · showcase", path: "/ko/showcase" },
  { name: "marketing · demo", path: "/ko/demo" },
  { name: "marketing · qr", path: "/ko/qr" },
  // ── link-in-bio (public) ──
  { name: "link-in-bio · u/{user}", path: "/ko/u/dohyun" },
  // ── links app (auth; backed by the links mock layer in lib/api/_links-mocks.ts) ──
  { name: "links · dashboard", path: "/ko/dashboard" },
  { name: "links · campaigns", path: "/ko/campaigns" },
  { name: "links · ctas", path: "/ko/ctas" },
  { name: "links · stats", path: "/ko/stats" },
  { name: "links · qr-campaigns", path: "/ko/qr-campaigns" },
  { name: "links · settings", path: "/ko/settings" },
  // ── blog workspace (auth) ──
  { name: "blog · posts", path: "/ko/blog/posts" },
  { name: "blog · analytics", path: "/ko/blog/analytics" },
  { name: "blog · drafts", path: "/ko/blog/drafts" },
  { name: "blog · leads", path: "/ko/blog/leads" },
  { name: "blog · curation", path: "/ko/blog/curation" },
  { name: "blog · settings", path: "/ko/blog/settings" },
  { name: "blog · tags", path: "/ko/blog/tags" },
  { name: "blog · tag detail", path: "/ko/blog/tags/개발" },
  { name: "blog · links-in-posts", path: "/ko/blog/links" },
  { name: "blog · series (workspace)", path: "/ko/blog/series" },
  { name: "blog · login", path: "/ko/blog/login" },
  // ── deep / dynamic routes that render with current mocks ──
  { name: "links · campaign create", path: "/ko/campaigns/new" },
  { name: "links · settings/profile", path: "/ko/settings/profile" },
  { name: "links · profile auto-setup", path: "/ko/profile/auto" },
  { name: "links · admin abuse-reports", path: "/ko/admin/abuse-reports" },
  { name: "blog · post analytics", path: "/ko/blog/analytics/1" },
  { name: "blog · editor (write/[id])", path: "/ko/blog/write/16" },
];

// Intentionally NOT in the sweep (documented gaps, not oversights):
//   • Heavy detail/stats views needing large mock shapes — /stats/{code}(+/public), /campaigns/{id}
//     (+/stats) — their LIST views are covered; the 40-field LinkStats / CampaignDetail mocks are high
//     cost / low marginal value. Add cases to lib/api/_links-mocks.ts to enable.
//   • Tool surfaces — /campaigns/{id}/poster-builder (canvas), /print-sheet, /batches/new.
//   • Redirect/flow handlers (not content screens) — /use/{slug}, /auth/callback, /auth/2fa.
//   • Role-gated — /admin root (needs an admin-role mock); /showcase/{handle} (needs showcase mock).

for (const s of SCREENS) {
  test(`renders: ${s.name}`, async ({ page }) => {
    await page.goto(s.path);
    // load + a beat for hydration/auth to resolve (auth-gated pages swap the login wall for content).
    await page.waitForLoadState("load");
    await page.waitForTimeout(900);
    await rendersCleanly(page, s.name);
  });
}
