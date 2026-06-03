import { test, expect } from "@playwright/test";

/**
 * Reader-side rendering — what a VISITOR actually sees on a published post. This is the gap the
 * authoring specs can't reach: blog-write-flow asserts the block PAYLOAD the editor saves, never how
 * the reader renders it (the bold-feedback regression slipped through exactly because nothing checked
 * lived output). The public post page is a Server Component that fetches its data server-side, which
 * Playwright cannot intercept — so this suite runs in MOCK-ON (NEXT_PUBLIC_USE_MOCKS=1), where the
 * in-memory mock serves a deterministic post whose body covers every block type.
 *
 * Runs in CI via the e2e-mock-on lane (a mock-ON build), separate from the mock-OFF authoring lane.
 */
test.use({ viewport: { width: 1280, height: 900 } });

// A seeded mock post (see modules/blog/api/_mocks.ts → SEEDS / sampleBlocks). Its body has a
// PARAGRAPH, H2s, a bulleted list, a TS code block, a blockquote, an image, and a GFM table.
const POST_PATH = "/en/p/dohyun/nextjs-14-app-router-blog";

test("a published post renders every block type for the reader", async ({ page }) => {
  await page.goto(POST_PATH);
  const article = page.locator(".prose-post");
  await expect(article).toBeVisible({ timeout: 30_000 });

  // Headings, list, blockquote, image, table, and the code block (with its real code text) must all
  // render as their semantic elements — a renderer regression for any block type fails loudly here.
  await expect(article.locator("h2").first()).toBeVisible();
  await expect(article.locator("ul li").first()).toBeVisible();
  await expect(article.locator("blockquote").first()).toBeVisible();
  await expect(article.locator("img").first()).toBeVisible();
  await expect(article.locator("table td").first()).toBeVisible();
  await expect(article.locator("pre").first()).toBeVisible();
  await expect(article).toContainText("function add");
});

test("reader typography is applied — heading is larger and bolder than body text", async ({ page }) => {
  // Guards the .prose-post editorial typography (the same class of bug as the missing .tiptap strong
  // rule): assert computed styles, not just element presence.
  await page.goto(POST_PATH);
  await expect(page.locator(".prose-post")).toBeVisible({ timeout: 30_000 });
  const m = await page.evaluate(() => {
    const px = (el: Element | null) => (el ? parseFloat(getComputedStyle(el).fontSize) : 0);
    const wt = (el: Element | null) => (el ? Number(getComputedStyle(el).fontWeight) : 0);
    const h2 = document.querySelector(".prose-post h2");
    const p = document.querySelector(".prose-post p");
    return { h2Size: px(h2), pSize: px(p), h2Weight: wt(h2) };
  });
  expect(m.h2Size).toBeGreaterThan(m.pSize);
  expect(m.h2Weight).toBeGreaterThanOrEqual(600);
});

test("a series post shows the series banner (progress + episode list) and an end-of-post next-up card", async ({
  page,
}) => {
  // The seeded mock post (POST_PATH) is part 1 of the "Next.js 깊게 파기" series, so the on-post series
  // UI renders for the reader: a top banner (title + progress stepper + collapsible episode list with
  // the current part marked) and a bottom "next in this series" continuation card.
  await page.goto(POST_PATH);
  await expect(page.locator(".prose-post")).toBeVisible({ timeout: 30_000 });

  const banner = page.locator("nav").filter({ hasText: "Next.js 깊게 파기" }).first();
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: /In this series/i }).click();
  // The current part is marked in the expanded episode list (not just listed).
  await expect(banner.locator('[aria-current="true"]')).toBeVisible();

  // End-of-post continuation: the next part card + a link to the whole series.
  await expect(page.getByText("Next in this series", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: /View all 3 parts/i })).toBeVisible();
});

test("a comment's @author handle links to the commenter's profile", async ({ page }) => {
  // The comment author (avatar + @handle) must be a link to their profile (cross-host on prod), not
  // plain text — so readers can jump from a comment to who wrote it.
  await page.goto(POST_PATH);
  await expect(page.locator(".prose-post")).toBeVisible({ timeout: 30_000 });
  const authorLink = page.locator('a[href*="/p/minji"]').first(); // seeded mock comment by @minji
  await expect(authorLink).toBeVisible();
  await expect(authorLink).toContainText("minji");
});
