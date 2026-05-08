import { expect, test } from "@playwright/test";

test.describe("recent links (localStorage)", () => {
  test("persists shortenings across reload", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/your-very-long-url/).fill("https://example.com/recent-1");
    await page.getByRole("button", { name: "단축하기" }).click();
    await expect(page.locator("a", { hasText: /\/[0-9A-Za-z]{7}/ }).first()).toBeVisible({
      timeout: 10000,
    });

    await page.reload();
    await expect(page.getByText("최근 단축")).toBeVisible();
    const recentItems = page.locator("ul li").filter({ hasText: "https://example.com/recent-1" });
    await expect(recentItems).toBeVisible();
  });

  test("multiple shortenings appear in recent list", async ({ page }) => {
    await page.goto("/");
    for (const url of [
      "https://example.com/recent-a",
      "https://example.com/recent-b",
      "https://example.com/recent-c",
    ]) {
      await page.getByPlaceholder(/your-very-long-url/).fill(url);
      await page.getByRole("button", { name: "단축하기" }).click();
      await expect(page.locator("a", { hasText: /\/[0-9A-Za-z]{7}/ }).first()).toBeVisible({
        timeout: 10000,
      });
    }
    await page.reload();
    await expect(page.getByText("최근 단축")).toBeVisible();
    await expect(page.getByText("https://example.com/recent-a")).toBeVisible();
    await expect(page.getByText("https://example.com/recent-b")).toBeVisible();
    await expect(page.getByText("https://example.com/recent-c")).toBeVisible();
  });
});
