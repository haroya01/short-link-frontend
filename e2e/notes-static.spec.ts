import { test, expect } from "@playwright/test";

// Mock-on lane on a production build: the notes page is one prerendered document for everyone, so the CDN
// serves it without running a function. The remembered tab is read in the browser instead of on the server.
test.use({ viewport: { width: 390, height: 844 } });

test("the notes page is a cacheable prerendered page", async ({ page }) => {
  const response = await page.goto("/ko/blog/notes");
  const cache = response?.headers()["cache-control"] ?? "";
  expect(cache).toContain("s-maxage");
  expect(cache).not.toContain("no-store");
  await expect(page.locator("article[data-note-id]").first()).toBeVisible({ timeout: 30_000 });
});

test("a remembered 팔로잉 tab still opens first, read in the browser", async ({ page, context }) => {
  const host = new URL(test.info().project.use.baseURL ?? "http://localhost:3001").hostname;
  await context.addCookies([{ name: "kurl_notes_feed", value: "following", domain: host, path: "/" }]);
  await page.goto("/ko/blog/notes");
  const tabs = page.locator("[data-feed-switcher='notes']");
  await expect(tabs.getByRole("link", { name: "팔로잉" })).toHaveAttribute("aria-current", "page", { timeout: 30_000 });
});
