import { expect, test, type Page } from "@playwright/test";

// mock-on 레인: 목 세션은 @dohyun 이다. minji 는 표시 이름 "민지"가 있고 팔로워 128 · 팔로잉 12,
// dohyun 은 표시 이름이 없고, sora 는 팔로워 수를 숨겼다.
const header = (page: Page) => page.locator("main header").first();
const counts = (page: Page) => header(page).locator("[data-profile-counts]");
const meta = (page: Page) => header(page).locator("[data-profile-meta]");
const tabs = (page: Page) => page.locator("nav:has([data-tab])").locator("[data-tab]");

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("방문자는 아바타 줄 아래에서 이름 · @핸들 · 숫자가 붙은 팔로워·팔로잉 · 글 수를 차례로 본다", async ({ page }) => {
    await page.goto("/ko/p/minji");
    const name = header(page).getByRole("heading", { level: 1 });
    await expect(name).toHaveText("민지", { timeout: 30_000 });
    await expect(header(page).getByText("@minji", { exact: true })).toBeVisible();
    await expect(counts(page)).toHaveText(/^팔로워\s*128\s*·\s*팔로잉\s*12\s*·\s*글\s*\d+편$/);
    await expect(counts(page).getByRole("button")).toHaveText(["팔로워 128", "팔로잉 12"]);

    const follow = await header(page).getByRole("button", { name: "팔로우", exact: true }).boundingBox();
    const title = await name.boundingBox();
    expect(title!.y).toBeGreaterThanOrEqual(follow!.y + follow!.height);
    await expect(meta(page).getByRole("link").last()).toHaveText("소개");
  });
});

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("표시 이름이 없으면 username 을 @ 없이 이름 자리에 두고, @핸들 줄은 그대로 둔다", async ({ page }) => {
    await page.goto("/ko/p/dohyun");
    await expect(header(page).getByRole("heading", { level: 1 })).toHaveText("dohyun", { timeout: 30_000 });
    await expect(header(page).getByText("@dohyun", { exact: true })).toBeVisible();
  });

  test("팔로워 수를 숨긴 작가는 팔로워·팔로잉을 통째로 빼고 글 수만 남긴다", async ({ page }) => {
    await page.goto("/ko/p/sora");
    await expect(counts(page)).toHaveText(/^글\s*\d+편$/, { timeout: 30_000 });
    await expect(header(page).getByRole("button", { name: /팔로워|팔로잉/ })).toHaveCount(0);
  });

  test("영어는 숫자가 앞에 오고 복수형을 따른다", async ({ page }) => {
    await page.goto("/en/p/minji");
    await expect(counts(page)).toHaveText(/^128 followers\s*·\s*12 following\s*·\s*\d+ posts?$/, { timeout: 30_000 });
  });

  test("소개는 탭 줄이 아니라 정보 줄 끝의 링크이고, 열면 그 링크가 현재 페이지가 되며 탭은 아무것도 고르지 않는다", async ({
    page,
  }) => {
    await page.goto("/ko/p/minji");
    await expect(tabs(page).first()).toBeVisible({ timeout: 30_000 });
    await expect(tabs(page).filter({ hasText: "소개" })).toHaveCount(0);

    const about = meta(page).getByRole("link", { name: "소개" });
    await about.click();
    await page.waitForURL(/\/p\/minji\/about$/);
    await expect(about).toHaveAttribute("aria-current", "page");
    await expect(page.locator("nav:has([data-tab]) [aria-current]")).toHaveCount(0);

    await tabs(page).filter({ hasText: /^글$/ }).click();
    await page.waitForURL(/\/p\/minji$/);
    await expect(tabs(page).filter({ hasText: /^글$/ })).toHaveAttribute("aria-current", "page");
    await expect(about).not.toHaveAttribute("aria-current", "page");
  });
});
