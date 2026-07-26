import { expect, test } from "@playwright/test";

test.describe("anonymous shorten flow", () => {
  test("home page renders hero and form", async ({ page }) => {
    await page.goto("/ko");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByPlaceholder(/긴 주소를 여기에/)).toBeVisible();
  });

  test("shortens a valid URL and answers on the line", async ({ page }) => {
    await page.goto("/ko");
    const input = page.getByPlaceholder(/긴 주소를 여기에/);
    await input.fill("https://example.com/playwright-test");
    await page.getByRole("button", { name: "단축하기" }).click();

    // 답 줄 — 카드가 아니라 입력 줄 자리에 짧은 주소가 내려앉는다.
    const line = page.getByTestId("result-line").first();
    await expect(line).toBeVisible({ timeout: 10000 });
    const resultLink = line.locator("a", { hasText: /\/[0-9A-Za-z]{7}/ }).first();
    await expect(resultLink).toBeVisible();
    await expect(page.getByRole("button", { name: "복사" }).first()).toBeVisible();
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
    await page.getByPlaceholder(/긴 주소를 여기에/).fill("ftp://example.com");
    await page.getByRole("button", { name: "단축하기" }).click();
    await expect(
      page.getByText(/http:\/\/ 또는 https:\/\/.*올바른 URL/),
    ).toBeVisible();
  });

  test("whispers expiry + signup for anonymous user", async ({ page }) => {
    await page.goto("/ko");
    await page.getByPlaceholder(/긴 주소를 여기에/).fill("https://example.com/cta-test");
    await page.getByRole("button", { name: "단축하기" }).click();
    // 속삭임 행 — 24h 만료 안내와 보관 유도가 답 줄 아래 한 줄로.
    await expect(page.getByText(/24시간 후 만료/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: /가입하고 통계 보관하기/ })).toBeVisible();
  });

  test("home counters render numbers", async ({ page }) => {
    await page.goto("/ko");
    await expect(page.getByText("단축된 링크")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("분석된 클릭")).toBeVisible();
  });

  test("advanced section is hidden for anonymous (auth-only customCode / expiry)", async ({
    page,
  }) => {
    await page.goto("/ko");
    await expect(page.locator("#shorten-advanced-section")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /고급 옵션|Advanced|詳細/i })).toHaveCount(0);
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
