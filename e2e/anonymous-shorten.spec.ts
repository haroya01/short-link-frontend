import { expect, test } from "@playwright/test";

test.describe("anonymous shorten flow", () => {
  test("home page renders hero and form", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByPlaceholder(/your-very-long-url/)).toBeVisible();
  });

  test("shortens a valid URL and shows result card", async ({ page }) => {
    await page.goto("/");
    const input = page.getByPlaceholder(/your-very-long-url/);
    await input.fill("https://example.com/playwright-test");
    await page.getByRole("button", { name: "단축하기" }).click();

    const resultLink = page.locator("a", { hasText: /\/[0-9A-Za-z]{7}/ }).first();
    await expect(resultLink).toBeVisible({ timeout: 10000 });

    const href = await resultLink.getAttribute("href");
    expect(href).toMatch(/\/[0-9A-Za-z]{7}$/);
  });

  test("rejects empty URL with inline error", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "단축하기" }).click();
    await expect(page.getByText("URL을 입력해 주세요.")).toBeVisible();
  });

  test("rejects non-http URL with inline error", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/your-very-long-url/).fill("ftp://example.com");
    await page.getByRole("button", { name: "단축하기" }).click();
    await expect(
      page.getByText(/http:\/\/ 또는 https:\/\/.*올바른 URL/),
    ).toBeVisible();
  });

  test("shows login CTA below result for anonymous user", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/your-very-long-url/).fill("https://example.com/cta-test");
    await page.getByRole("button", { name: "단축하기" }).click();
    await expect(page.getByText(/로그인하면.*클릭 통계/)).toBeVisible({ timeout: 10000 });
  });
});
