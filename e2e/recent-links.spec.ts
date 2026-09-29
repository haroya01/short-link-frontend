import { expect, test } from "@playwright/test";
import { mockAnonymousShorten } from "./helpers/mock-shorten";

test.describe("recent links (localStorage)", () => {
  test.beforeEach(async ({ page }) => {
    await mockAnonymousShorten(page);
  });

  test("persists shortenings across reload", async ({ page }) => {
    await page.goto("/ko");
    await page.getByPlaceholder(/긴 주소를 여기에/).fill("https://example.com/recent-1");
    await page.getByRole("button", { name: "단축하기" }).click();
    await expect(page.getByTestId("result-line").first().locator("a", { hasText: /\/e2eAb\d{2}/ }).first()).toBeVisible();
    // 방금 만든 링크는 답 줄에 이미 있으니 최근 목록에 겹쳐 나오지 않는다.
    await expect(page.getByRole("heading", { name: "최근 만든 링크" })).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("heading", { name: "최근 만든 링크" })).toBeVisible();
    const recentItems = page.locator("ul li").filter({ hasText: "https://example.com/recent-1" });
    await expect(recentItems).toBeVisible();
  });

  test("multiple shortenings appear in recent list", async ({ page }) => {
    await page.goto("/ko");
    for (const [i, url] of [
      "https://example.com/recent-a",
      "https://example.com/recent-b",
      "https://example.com/recent-c",
    ].entries()) {
      // 답 줄이 입력 줄의 자리를 차지하므로, 두 번째부터는 빈 줄을 다시 불러온다.
      if (i > 0) await page.getByRole("button", { name: "다른 주소도 줄이기" }).click();
      await page.getByPlaceholder(/긴 주소를 여기에/).fill(url);
      await page.getByRole("button", { name: "단축하기" }).click();
      // 앞선 답 줄이 이미 떠 있으니, 이번 주소의 답 줄이 생길 때까지 기다린다(그 전에 새로고침하면 요청이 끊긴다).
      await expect(page.getByTestId("result-line").filter({ hasText: url })).toBeVisible();
    }
    await page.reload();
    await expect(page.getByRole("heading", { name: "최근 만든 링크" })).toBeVisible();
    await expect(page.getByText("https://example.com/recent-a")).toBeVisible();
    await expect(page.getByText("https://example.com/recent-b")).toBeVisible();
    await expect(page.getByText("https://example.com/recent-c")).toBeVisible();
  });
});
