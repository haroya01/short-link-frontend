import { expect, test } from "@playwright/test";

/**
 * 동의 배너가 "실제로" 무언가를 막는지 지킨다. 예전엔 확인 버튼 하나뿐이었고, 동의 상태를 읽는
 * 코드가 배너 자기 자신뿐이라 버튼을 눌러도 수집에는 아무 영향이 없었다 — 배너만 닫혔다.
 */
test.describe("쿠키 동의", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("아무것도 고르기 전에는 분석 저장소를 건드리지 않는다", async ({ page }) => {
    const analyticsHits: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("posthog")) analyticsHits.push(r.url());
    });

    await page.goto("/ko");
    await expect(page.locator("[data-cc-banner]")).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(2500);

    const stored = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("ph_")));
    expect(stored, "동의 전에 분석 식별자가 단말에 심겼다").toEqual([]);
    expect(analyticsHits, "동의 전에 분석 SDK 를 받아왔다").toEqual([]);
  });

  test("거부와 동의는 같은 크기다 — 거부가 동의만큼 쉬워야 유효한 동의다", async ({ page }) => {
    await page.goto("/ko");
    const banner = page.locator("[data-cc-banner]");
    await expect(banner).toBeVisible({ timeout: 15_000 });

    const buttons = banner.locator("button");
    await expect(buttons, "배너에 선택지가 둘이 아니다").toHaveCount(2);

    const [reject, accept] = await Promise.all([
      buttons.nth(0).boundingBox(),
      buttons.nth(1).boundingBox(),
    ]);
    expect(reject && accept).toBeTruthy();
    // 폰트/문구 길이 차이만큼의 가로 편차는 허용하고, 눌리는 면적의 급이 같은지를 본다.
    expect(Math.abs(reject!.height - accept!.height)).toBeLessThanOrEqual(1);
    expect(reject!.width).toBeGreaterThan(accept!.width * 0.6);
  });

  test("거부를 고르면 거부로 기억하고 배너가 사라진다", async ({ page, context }) => {
    await page.goto("/ko");
    const banner = page.locator("[data-cc-banner]");
    await expect(banner).toBeVisible({ timeout: 15_000 });

    await banner.locator("button").first().click();
    await expect(banner).toBeHidden();

    const cookie = (await context.cookies()).find((c) => c.name === "cookie-consent");
    expect(cookie?.value).toBe("rejected");

    // 다시 방문해도 묻지 않는다 — 거부를 기억하지 못하면 매번 다시 뜬다.
    await page.goto("/ko");
    await page.waitForTimeout(1200);
    await expect(page.locator("[data-cc-banner]")).toHaveCount(0);
  });
});
