import { expect, test } from "@playwright/test";

test.describe("recent links (localStorage)", () => {
  test("persists shortenings across reload", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/긴 주소를 여기에/).fill("https://example.com/recent-1");
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
    for (const [i, url] of [
      "https://example.com/recent-a",
      "https://example.com/recent-b",
      "https://example.com/recent-c",
    ].entries()) {
      // 답 줄이 입력 줄의 자리를 차지하므로, 두 번째부터는 빈 줄을 다시 불러온다.
      if (i > 0) await page.getByRole("button", { name: "다른 주소도 줄이기" }).click();
      await page.getByPlaceholder(/긴 주소를 여기에/).fill(url);
      await page.getByRole("button", { name: "단축하기" }).click();
      await expect(
        page.getByTestId("result-line").first().locator("a", { hasText: /\/[0-9A-Za-z]{7}/ }).first(),
      ).toBeVisible({ timeout: 10000 });
    }
    await page.reload();
    await expect(page.getByText("최근 단축")).toBeVisible();
    await expect(page.getByText("https://example.com/recent-a")).toBeVisible();
    await expect(page.getByText("https://example.com/recent-b")).toBeVisible();
    await expect(page.getByText("https://example.com/recent-c")).toBeVisible();
  });
});
