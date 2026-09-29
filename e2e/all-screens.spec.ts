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

async function rendersCleanly(page: Page, name: string, status: number | null) {
  // The branded 404 page (not-found.tsx) has an h1 + full-height body, so it otherwise sails through
  // every structural check below — the sweep would greenlight a deleted route. Two gates catch it:
  //   1. HTTP status < 400 — the plain case (a request that resolves straight to a 404 response).
  //   2. The not-found boundary itself — a deleted /{locale}/foo can rewrite through middleware to a
  //      still-registered handler that renders the 404 body with a 200 status (e.g. the /qr → links/qr
  //      chain), so the status alone won't flag it. not-found.tsx carries data-testid="not-found".
  expect(status, `${name}: HTTP status < 400`).not.toBeNull();
  expect(status as number, `${name}: HTTP status < 400`).toBeLessThan(400);
  await expect(
    page.locator("[data-testid='not-found']"),
    `${name}: not the 404 not-found page`,
  ).toHaveCount(0);
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
  { name: "marketing · about", path: "/ko/about" },
  { name: "marketing · learn", path: "/ko/learn" },
  { name: "marketing · privacy", path: "/ko/privacy" },
  { name: "marketing · terms", path: "/ko/terms" },
  { name: "marketing · login", path: "/ko/login" },
  { name: "marketing · showcase", path: "/ko/showcase" },
  { name: "marketing · demo", path: "/ko/demo" },
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
  { name: "blog · series (workspace)", path: "/ko/blog/series" },
  { name: "blog · login", path: "/ko/blog/login" },
  // ── deep / dynamic routes that render with current mocks ──
  { name: "links · campaign create", path: "/ko/campaigns/new" },
  { name: "links · settings/profile", path: "/ko/settings/profile" },
  { name: "links · profile auto-setup", path: "/ko/profile/auto" },
  { name: "blog · post analytics", path: "/ko/blog/analytics/1" },
  { name: "blog · editor (write/[id])", path: "/ko/blog/write/16" },
];

// Intentionally NOT in the sweep (documented gaps, not oversights):
//   • Heavy detail/stats views needing large mock shapes — /stats/{code}(+/public), /campaigns/{id}
//     (+/stats) — their LIST views are covered; the 40-field LinkStats / CampaignDetail mocks are high
//     cost / low marginal value. Add cases to lib/api/_links-mocks.ts to enable.
//   • Tool surfaces — /campaigns/{id}/poster-builder (canvas), /print-sheet, /batches/new.
//   • Redirect/flow handlers (not content screens) — /use/{slug}, /auth/callback, /auth/2fa.
//   • Role-gated — /admin root and /admin/abuse-reports (both hard-404 for a non-admin via notFound(),
//     so the mock reader can't render them — needs an admin-role mock); /showcase/{handle} (needs showcase mock).

for (const s of SCREENS) {
  test(`renders: ${s.name}`, async ({ page }) => {
    const response = await page.goto(s.path);
    // load + a beat for hydration/auth to resolve (auth-gated pages swap the login wall for content).
    await page.waitForLoadState("load");
    await page.waitForTimeout(900);
    await rendersCleanly(page, s.name, response?.status() ?? null);
  });
}

test("link-in-bio: 표지가 있어도 아바타가 표지 위에 보인다", async ({ page }) => {
  await page.goto("/ko/u/dohyun");
  const avatar = page.locator("[data-profile-avatar]");
  await expect(avatar).toBeVisible();
  // 표지는 mask-image 로 따로 쌓이는 층이다. 머리가 그 아래에 깔리면 아바타 자리에서 표지가 잡힌다.
  const onTop = await avatar.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && (hit === el || el.contains(hit));
  });
  expect(onTop, "아바타 가운데를 누르면 아바타가 잡혀야 한다").toBe(true);
});

test("link-in-bio: 대표 링크가 맨 위, 이어진 보통 링크는 한 장의 목록", async ({ page }) => {
  await page.goto("/ko/u/dohyun");
  await expect(page.getByText("대표 링크")).toBeVisible();
  const layout = await page.evaluate(() => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href*="src=profile-dohyun"]')];
    const byTitle = (t: string) => links.find((a) => a.textContent?.includes(t));
    const featured = byTitle("GitHub");
    const rows = ["X (Twitter)", "YouTube 채널", "이메일"].map(byTitle);
    const lists = new Set(rows.map((a) => a?.closest("ul")));
    return {
      featuredFirst: !!featured && links.indexOf(featured) === 0,
      oneList: rows.every(Boolean) && lists.size === 1,
    };
  });
  expect(layout.featuredFirst, "대표 링크가 첫 링크여야 한다").toBe(true);
  expect(layout.oneList, "이어진 보통 링크는 한 목록에 있어야 한다").toBe(true);
});
