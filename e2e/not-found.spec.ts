import { expect, test } from "@playwright/test";

test.describe("404", () => {
  test("typo path renders friendly not-found page", async ({ page }) => {
    await page.goto("/this-path-does-not-exist-xyzzy");
    await expect(page.getByText(/이 페이지를 찾을 수 없어요|Page not found|ページが見つかりません/)).toBeVisible({
      timeout: 5000,
    });
  });
});
