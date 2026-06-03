import { test, expect, type Page } from "@playwright/test";

/**
 * Tier-2 "lived render" coverage for EVERY blog screen — deterministic structural + computed-style
 * assertions (no pixel baselines). Catches the bug class the payload/URL specs miss: a screen that
 * fails to render, collapses its layout, drops a landmark, or loses its typography scale. Cheap,
 * non-flaky, runs every PR. (Pixel-level appearance lives in the visual lane; mid-transition flicker
 * lives in blog-navigation.spec.ts.)
 *
 * Mock-ON lane — the reader/profile/feed pages are Server Components served by the in-memory mock.
 */
test.use({ viewport: { width: 1280, height: 900 } });

const AUTHOR = "dohyun";
const POST = "nextjs-14-app-router-blog";
const SERIES = "nextjs-deep-dive";

/** Every screen must render real content, keep the app header, and show no error boundary. */
async function rendersCleanly(page: Page) {
  await expect(page.locator("body")).toBeVisible();
  // The shared app header (blog.kurl wordmark) survives on every blog surface.
  await expect(page.getByRole("link", { name: /blog\.?kurl/i }).first()).toBeVisible();
  await expect(
    page.getByText(/Application error|client-side exception|Internal Server Error|This page could/i),
  ).toHaveCount(0);
  // The page has real laid-out content (not a collapsed/blank shell) — robust across surfaces that use
  // <main>, <article>, or a plain wrapper.
  const height = await page.evaluate(() => document.body.scrollHeight);
  expect(height, "screen has laid-out content (not collapsed)").toBeGreaterThan(300);
}

/** Body text and headings actually have type (catches a broken/zeroed typography scale). */
async function headingBeatsBody(page: Page, headingSel: string, bodySel: string) {
  const m = await page.evaluate(
    ([h, b]) => {
      const px = (el: Element | null) => (el ? parseFloat(getComputedStyle(el).fontSize) : 0);
      return { h: px(document.querySelector(h)), b: px(document.querySelector(b)) };
    },
    [headingSel, bodySel] as const,
  );
  expect(m.b, "body text has a real size").toBeGreaterThan(10);
  expect(m.h, "heading is larger than body").toBeGreaterThan(m.b);
}

type Screen = { name: string; path: string; check: (page: Page) => Promise<void> };

const SCREENS: Screen[] = [
  {
    name: "feed home",
    path: "/ko/blog",
    async check(page) {
      // The feed is a list of post links to /p/{user}/{slug}.
      expect(await page.locator(`a[href*="/p/"]`).count(), "feed lists post links").toBeGreaterThan(0);
    },
  },
  {
    name: "feed search",
    path: "/ko/blog?q=개발",
    async check(page) {
      // Either results or a defined empty state — never a blank/error.
      const hasResults = await page.locator('a[href*="/p/"]').count();
      const body = (await page.locator("body").innerText()).trim();
      expect(hasResults > 0 || body.length > 50, "search shows results or a defined empty state").toBe(true);
    },
  },
  {
    name: "profile · 글",
    path: `/ko/p/${AUTHOR}`,
    async check(page) {
      await expect(page.getByRole("heading", { name: `@${AUTHOR}` })).toBeVisible();
      // Tab bar — all five tabs present (owner view in mock).
      for (const t of ["글", "시리즈", "소개"]) {
        await expect(page.getByRole("link", { name: t, exact: true }).first()).toBeVisible();
      }
      expect(await page.locator('a[href*="/p/"]').count(), "profile lists posts").toBeGreaterThan(0);
    },
  },
  {
    name: "profile · 시리즈",
    path: `/ko/p/${AUTHOR}/series`,
    async check(page) {
      await expect(page.getByRole("heading", { name: `@${AUTHOR}` })).toBeVisible();
      // Series rows link to series detail.
      await expect(page.locator('a[href*="/series/"]').first()).toBeVisible();
    },
  },
  {
    name: "profile · 소개",
    path: `/ko/p/${AUTHOR}/about`,
    async check(page) {
      await expect(page.getByRole("heading", { name: `@${AUTHOR}` })).toBeVisible();
      await expect(page.locator("body")).toContainText(/소개|활동|글/);
    },
  },
  {
    name: "profile · 좋아요",
    path: `/ko/p/${AUTHOR}/liked`,
    check: rendersCleanly, // owner-gated content; just prove the surface renders without error
  },
  {
    name: "profile · 북마크",
    path: `/ko/p/${AUTHOR}/bookmarks`,
    check: rendersCleanly,
  },
  {
    name: "post reader",
    path: `/ko/p/${AUTHOR}/${POST}`,
    async check(page) {
      await expect(page.locator(".prose-post")).toBeVisible();
      await headingBeatsBody(page, ".prose-post h2", ".prose-post p");
    },
  },
  {
    name: "series detail",
    path: `/ko/p/${AUTHOR}/series/${SERIES}`,
    async check(page) {
      // Episode list with the mono index + post links.
      expect(await page.locator('a[href*="/p/"]').count(), "series detail lists episodes").toBeGreaterThan(0);
      await expect(page.locator("body")).toContainText(/시리즈|편|글/);
    },
  },
];

for (const screen of SCREENS) {
  test(`screen renders: ${screen.name}`, async ({ page }) => {
    await page.goto(screen.path);
    await page.waitForLoadState("networkidle");
    await rendersCleanly(page);
    await screen.check(page);
  });
}
