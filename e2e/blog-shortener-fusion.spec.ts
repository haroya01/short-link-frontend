import { test, expect } from "@playwright/test";

/**
 * The blog × shortener fusion — the wedge only kurl can show: a post is backed by measured links, and
 * the clicks those in-post links earn attribute back to the post. Two render-side contracts had no e2e
 * cover:
 *  1. an embedded kurl short link carries `?post={id}` on its outbound href (so the redirect credits
 *     this post), while a plain non-kurl link does NOT get rewritten;
 *  2. the per-post analytics page renders the per-link breakdown (shortCode · destination · clicks).
 *
 * Runs in MOCK-ON (NEXT_PUBLIC_USE_MOCKS=1): the post/analytics pages fetch client- or server-side
 * against the in-memory mock, which also seeds a signed-in viewer — so the authenticated analytics
 * surface resolves instead of gating. Same lane as blog-post-render.
 */
test.use({ viewport: { width: 1280, height: 900 } });

// The seeded mock post (id 1, see modules/blog/api/_mocks.ts). Its body embeds a kurl short link
// (kurl.me/abc123 → EMBED block) and a plain markdown link to k6.io (non-kurl).
const POST_PATH = "/en/p/dohyun/nextjs-14-app-router-blog";

test("an in-post kurl short link carries ?post= on its outbound href; a non-kurl link does not", async ({
  page,
}) => {
  await page.goto(POST_PATH);
  const article = page.locator(".prose-post");
  await expect(article).toBeVisible({ timeout: 30_000 });

  // The kurl link renders as a link-stats card whose outbound anchor points at the short link WITH
  // `?post=1` appended (the mock post is id 1) — that's the click-attribution contract.
  const kurlLink = article.locator('a[href*="kurl.me/abc123"]').first();
  await expect(kurlLink).toBeVisible({ timeout: 10_000 });
  await expect(kurlLink).toHaveAttribute("href", /kurl\.me\/abc123\?post=1\b/);

  // The plain (non-kurl) markdown link is left untouched — no `?post=` rewrite leaks onto other hosts.
  const plainLink = article.locator('a[href*="k6.io/docs"]').first();
  await expect(plainLink).toBeVisible();
  const plainHref = await plainLink.getAttribute("href");
  expect(plainHref, "a non-kurl link must not be rewritten with ?post=").not.toContain("post=");
});

test("the per-post analytics page renders the per-link click breakdown (shortCode · destination · clicks)", async ({
  page,
}) => {
  // Analytics is authenticated + client-fetched; mock-on seeds the signed-in viewer and getPostAnalytics
  // returns a linkBreakdown for any post id. Post 1's breakdown lists kurl-a1 → github.com/... etc.
  await page.goto("/en/blog/analytics/1");

  // The breakdown section: each row shows the destination URL, the kurl.me/<code> short link, and the
  // click count. Assert the section renders a real row from the mock (kurl-a1 → github destination).
  const shortLink = page.getByText("kurl.me/kurl-a1", { exact: false });
  await expect(shortLink).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("github.com/haroya01/short-link", { exact: false })).toBeVisible();

  // The row carries a numeric click count (tabular-nums) — the "which link earned the clicks" answer.
  const row = page.locator("li", { hasText: "kurl.me/kurl-a1" }).first();
  await expect(row).toContainText(/\d/);
});
