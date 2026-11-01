import { expect, test } from "@playwright/test";

test("an author home names itself without a trailing slash, so the canonical is not a redirect", async ({ page, request }) => {
  await page.goto("/ko/p/dohyun");
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical).toMatch(/\/@dohyun$/);
  const og = await page.locator('meta[property="og:url"]').getAttribute("content");
  expect(og).toBe(canonical);
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.join("\n")).not.toContain("@dohyun/\"");

  const slashed = await request.get("/ko/p/dohyun/", { maxRedirects: 0 });
  expect([301, 307, 308]).toContain(slashed.status());
});

test("the blog home calls itself kurl log in the tab and in shared cards", async ({ page }) => {
  await page.goto("/ko/blog");
  await expect(page).toHaveTitle("kurl log");
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "kurl log");
});
