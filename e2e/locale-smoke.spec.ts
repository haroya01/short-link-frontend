import { expect, test } from "@playwright/test";

/**
 * 로케일 스모크 — 세그먼트 레이아웃(links/layout 등)이 setRequestLocale 없이 getMessages() 를
 * 부르면, 정적 렌더에서 en/ja/vi/hi HTML 에 defaultLocale(ko) 카탈로그가 실린다(#881 회귀,
 * lang 속성만 제 로케일이라 육안·단일 로케일 e2e 로는 안 잡혔다). 비-ko 두 로케일의 SSR
 * 본문이 제 언어인지 못박는다.
 */
test.describe("locale smoke (non-ko catalogs)", () => {
  test("/en landing serves the English catalog", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByPlaceholder(/Paste your long URL here/)).toBeVisible();
    await expect(page.getByText("긴 주소를 여기에 붙여넣으세요")).toHaveCount(0);
  });

  test("/ja landing serves the Japanese catalog", async ({ page }) => {
    await page.goto("/ja");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await expect(page.getByPlaceholder(/長いURLをここに貼り付け/)).toBeVisible();
  });

  test("/en demo stats renders English journal + masthead", async ({ page }) => {
    await page.goto("/en/demo");
    await expect(page.getByText("Link journal")).toBeVisible();
    await expect(page.getByText("링크 일지")).toHaveCount(0);
  });
});
