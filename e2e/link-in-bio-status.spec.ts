import { expect, test } from "@playwright/test";

// mock-on 레인: 목은 dohyun_old 를 dohyun 의 명함으로 풀고(이름을 바꾼 지 30일 안), missing_card 에는
// 아무것도 주지 않는다. 명함 라우트에 loading.tsx(Suspense)가 다시 생기면 둘 다 HTTP 200
// (meta refresh, soft-404)으로 돌아간다.
test.describe("명함 HTTP 상태", () => {
  test("옛 핸들은 지금 핸들로 307, 쿼리는 그대로", async ({ request }) => {
    const res = await request.get("/ko/u/dohyun_old?utm_source=instagram", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toBe("/ko/u/dohyun?utm_source=instagram");
  });

  test("없는 핸들은 404", async ({ request }) => {
    const res = await request.get("/ko/u/missing_card", { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });

  test("옛 핸들로 들어온 방문자는 새 명함에 도착한다", async ({ page }) => {
    await page.goto("/ko/u/dohyun_old?utm_source=instagram");
    await expect(page).toHaveURL(/\/ko\/u\/dohyun\?utm_source=instagram$/);
    await expect(page.locator("[data-profile-avatar]")).toBeVisible();
    await expect(page.locator("[data-testid='not-found']")).toHaveCount(0);
  });
});
