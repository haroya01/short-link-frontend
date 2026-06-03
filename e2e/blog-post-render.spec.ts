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
