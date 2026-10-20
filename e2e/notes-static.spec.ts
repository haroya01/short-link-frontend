import { test, expect } from "@playwright/test";

// Mock-on lane on a production build: 홈 is one prerendered document for everyone, so the CDN serves it
// without running a function. The old notes address only forwards to 홈.
test.use({ viewport: { width: 390, height: 844 } });

test("홈 is a cacheable prerendered page", async ({ page }) => {
  const response = await page.goto("/ko/blog");
  const cache = response?.headers()["cache-control"] ?? "";
  expect(cache).toContain("s-maxage");
  expect(cache).not.toContain("no-store");
  await expect(page.getByTestId("home-feed")).toBeVisible({ timeout: 30_000 });
});
