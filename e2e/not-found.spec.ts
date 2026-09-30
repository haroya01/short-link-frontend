import { expect, test } from "@playwright/test";

test.describe("404", () => {
  test("typo path renders friendly not-found page", async ({ page }) => {
    await page.goto("/ko/this-path-does-not-exist-xyzzy");
    await expect(page.getByRole("heading", { name: "이 페이지를 찾을 수 없어요" })).toBeVisible();
  });

  // The 404 document is static and carries every locale's copy; one must be on screen for each.
  for (const [locale, heading] of [
    ["en", "Page not found"],
    ["ja", "ページが見つかりません"],
    ["vi", "Không tìm thấy trang"],
    ["hi", "पेज नहीं मिला"],
  ] as const) {
    test(`a first visit to /${locale}/… reads in that language`, async ({ page }) => {
      await page.goto(`/${locale}/this-path-does-not-exist-xyzzy`);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(page.locator("[data-nf]:visible")).toHaveCount(1);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page).toHaveTitle(`${heading} · kurl`);
    });
  }

  test("the address wins over a saved locale", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "NEXT_LOCALE", value: "ja", url: baseURL! }]);
    await page.goto("/ko/this-path-does-not-exist-xyzzy");
    await expect(page.getByRole("heading", { name: "이 페이지를 찾을 수 없어요" })).toBeVisible();
    await expect(page.locator("[data-nf]:visible")).toHaveCount(1);
  });
});
