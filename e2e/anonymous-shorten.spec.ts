import { expect, test } from "@playwright/test";

test.describe("anonymous shorten flow", () => {
  test("home page renders hero and form", async ({ page }) => {
    await page.goto("/ko");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByPlaceholder(/your-very-long-url/)).toBeVisible();
  });

  test("shortens a valid URL and shows result card", async ({ page }) => {
    await page.goto("/ko");
    const input = page.getByPlaceholder(/your-very-long-url/);
    await input.fill("https://example.com/playwright-test");
    await page.getByRole("button", { name: "단축하기" }).click();

    const resultLink = page.locator("a", { hasText: /\/[0-9A-Za-z]{7}/ }).first();
    await expect(resultLink).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("단축 완료")).toBeVisible();
    await expect(page.getByRole("link", { name: "열기" }).first()).toBeVisible();

    const href = await resultLink.getAttribute("href");
    expect(href).toMatch(/\/[0-9A-Za-z]{7}$/);
  });

  test("rejects empty URL with inline error", async ({ page }) => {
    await page.goto("/ko");
    await page.getByRole("button", { name: "단축하기" }).click();
    await expect(page.getByText("URL을 입력해 주세요.")).toBeVisible();
  });

  test("rejects non-http URL with inline error", async ({ page }) => {
    await page.goto("/ko");
    await page.getByPlaceholder(/your-very-long-url/).fill("ftp://example.com");
    await page.getByRole("button", { name: "단축하기" }).click();
    await expect(
      page.getByText(/http:\/\/ 또는 https:\/\/.*올바른 URL/),
    ).toBeVisible();
  });

  test("shows login CTA below result for anonymous user", async ({ page }) => {
    await page.goto("/ko");
    await page.getByPlaceholder(/your-very-long-url/).fill("https://example.com/cta-test");
    await page.getByRole("button", { name: "단축하기" }).click();
    await expect(page.getByText(/로그인하면.*클릭 통계/)).toBeVisible({ timeout: 10000 });
  });

  test("home counters render numbers", async ({ page }) => {
    await page.goto("/ko");
    await expect(page.getByText("단축된 링크")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("분석된 클릭")).toBeVisible();
  });

  test("advanced section reveals with animated grid-rows height", async ({ page }) => {
    await page.goto("/ko");
    const panel = page.locator("#shorten-advanced-section");
    await expect(panel).toBeAttached();

    // Resting collapsed state: the grid-rows track is 0fr so the panel has no rendered height.
    const collapsedHeight = await panel.evaluate((el) => el.getBoundingClientRect().height);
    expect(collapsedHeight).toBe(0);

    const toggle = page.getByRole("button", { name: /고급 옵션|Advanced|詳細/i });
    await toggle.click();

    // Give the 280ms grid-template-rows transition time to settle, then re-measure. A successful
    // reveal puts the panel above some non-trivial threshold (channel pills + utm input + border).
    await page.waitForTimeout(360);
    const expandedHeight = await panel.evaluate((el) => el.getBoundingClientRect().height);
    expect(expandedHeight).toBeGreaterThan(60);

    // The toggle should report aria-expanded after the click — verifies the controls binding for AT.
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  test("FAQ accordion expands", async ({ page }) => {
    await page.goto("/ko");
    const faq = page.getByRole("heading", { name: "자주 묻는 질문" });
    await expect(faq).toBeVisible();
    const firstQ = page.getByRole("button", { name: /단축 링크는 영구 보존되나요/ });
    await firstQ.click();
    await expect(page.getByText(/24시간 후 자동 만료/)).toBeVisible();
  });
});
