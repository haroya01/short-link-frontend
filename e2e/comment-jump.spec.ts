import { test, expect, type Page } from "@playwright/test";

/**
 * A notification about a comment opens the post AT that comment (`#comment-<id>`). The comment list is
 * fetched client-side after the page renders, so the browser's own hash jump has nothing to land on —
 * PostComments scrolls once the rows exist and flashes the row. Runs in MOCK-ON like post-highlights:
 * the in-memory mock serves the post and three comments (ids 1–3).
 */
test.use({ viewport: { width: 1280, height: 900 } });

const POST_PATH = "/en/p/dohyun/nextjs-14-app-router-blog";

async function waitReady(page: Page) {
  await expect(page.locator(".prose-post")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("comment-composer-placeholder")).toBeVisible({ timeout: 15_000 });
}

async function expectInViewport(page: Page, selector: string) {
  await expect(async () => {
    const box = await page.locator(selector).boundingBox();
    expect(box, `${selector} is rendered`).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(900);
  }).toPass({ timeout: 10_000 });
}

test("a #comment link scrolls to that comment and flashes it", async ({ page }) => {
  await page.goto(`${POST_PATH}#comment-3`);
  await waitReady(page);

  await expectInViewport(page, "#comment-3");
  await expect(page.locator("#comment-3")).toHaveClass(/bg-accent-50/);
  await expect(page.locator("#comment-3")).not.toHaveClass(/bg-accent-50/, { timeout: 5_000 });
});

test("a link to a comment that is gone lands on the comments section", async ({ page }) => {
  await page.goto(`${POST_PATH}#comment-999`);
  await waitReady(page);

  await expectInViewport(page, "#comments h2");
});

test("without a hash the post opens at the top", async ({ page }) => {
  await page.goto(POST_PATH);
  await waitReady(page);
  await page.waitForTimeout(1_000);

  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("a comment notification links to its comment", async ({ page }) => {
  await page.goto("/en/blog/notifications");

  await expect(page.locator('a[href$="/typescript-generics#comment-3"]')).toHaveCount(1, {
    timeout: 15_000,
  });
});

test("a comment in the library's 'my comments' links to that comment", async ({ page }) => {
  await page.goto("/en/blog/curation");
  const section = page.getByRole("button", { name: /My comments/ });
  await section.click();

  await expect(
    page.locator('a[href$="/nextjs-14-app-router-blog#comment-9101"]').first(),
  ).toBeVisible({ timeout: 15_000 });
});

test("a comment links the members it mentions and leaves other @names as text", async ({ page }) => {
  await page.goto(`${POST_PATH}#comment-2`);
  await waitReady(page);

  const reply = page.locator("#comment-2");
  await expect(reply.getByRole("link", { name: "@minji", exact: true })).toHaveAttribute("href", /\/p\/minji$/);
  await expect(reply.getByRole("link", { name: "@nobody_here" })).toHaveCount(0);
  await expect(reply).toContainText("@nobody_here");
});
