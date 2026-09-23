import { expect, test } from "@playwright/test";

test.describe("404", () => {
  test("typo path renders friendly not-found page", async ({ page }) => {
    await page.goto("/ko/this-path-does-not-exist-xyzzy");
    await expect(page.getByRole("heading", { name: "이 페이지를 찾을 수 없어요" })).toBeVisible();
  });
});
