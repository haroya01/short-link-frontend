import { expect, test, type Page } from "@playwright/test";

/**
 * 로그인 확인 전 첫 화면은 방문자와 로그인 사용자 각각에 맞는 쪽을 보인다. JS 청크를 막아 하이드레이션
 * 전 순간을 붙잡는다 — 이때는 인라인 pre-paint 스크립트(authHint)와 CSS 만으로 고른다.
 */
async function freezeBeforeHydration(page: Page) {
  await page.route("**/_next/static/chunks/**", (route) => route.abort());
}

test.describe("첫 화면에 엉뚱한 쪽이 번쩍이지 않는다", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("방문자: 모집은 소개, 머리글은 방문자 메뉴", async ({ page }) => {
    await freezeBeforeHydration(page);
    await page.goto("/ko/events");

    await expect(page.getByRole("link", { name: "로그인하고 시작하기" })).toBeVisible();
    await expect(page.getByRole("link", { name: "새 모집" })).toBeHidden();
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "프로필 예시" })).toBeVisible();
    await expect(header.getByRole("link", { name: "분석" })).toBeHidden();
    await expect(header.getByRole("link", { name: "로그인" })).toBeVisible();
  });

  test("로그인 흔적이 있으면: 모집은 목록 틀, 머리글은 로그인 메뉴", async ({ page }) => {
    await page.context().addInitScript(() => {
      window.localStorage.setItem("short-link:access-token", "e2e-token");
    });
    await freezeBeforeHydration(page);
    await page.goto("/ko/events");

    await expect(page.getByRole("link", { name: "새 모집" })).toBeVisible();
    await expect(page.getByRole("link", { name: "로그인하고 시작하기" })).toBeHidden();
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "분석" })).toBeVisible();
    await expect(header.getByRole("link", { name: "프로필 예시" })).toBeHidden();
    await expect(header.getByRole("link", { name: "로그인" })).toBeHidden();
  });
});
