import { expect, test, type Locator } from "@playwright/test";

async function visualLineCount(locator: Locator) {
  return locator.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const lineHeight = Number.parseFloat(style.lineHeight);
    return Math.round(el.getBoundingClientRect().height / lineHeight);
  });
}

test.describe("design polish guards", () => {
  test("mobile hero headline and subhead stay within two lines in every locale", async ({
    page,
  }) => {
    for (const viewport of [
      { width: 375, height: 667 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);

      for (const locale of ["ko", "en", "ja"]) {
        await page.goto(`/${locale}`);

        const heading = page.getByTestId("home-hero-heading");
        const subhead = page.getByTestId("home-hero-subhead");
        await expect(heading).toBeVisible();
        await expect(subhead).toBeVisible();

        expect(await visualLineCount(heading)).toBeLessThanOrEqual(2);
        expect(await visualLineCount(subhead)).toBeLessThanOrEqual(2);
      }
    }
  });

  test("mobile cookie consent stays compact on the landing page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ko");

    const banner = page.getByRole("dialog", { name: "cookie consent" });
    await expect(banner).toBeVisible();

    const box = await banner.locator("> div").boundingBox();
    expect(box?.height).toBeLessThanOrEqual(88);
  });

  test("showcase hero CTA is visible before examples on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/ko/showcase");

    await expect(page.getByRole("heading", { name: /내 프로필도 5 분이면 완성/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /내 프로필 만들기/ })).toBeVisible();

    const examplesTop = await page
      .getByRole("heading", { name: "내가 원하는 스타일대로" })
      .evaluate((el) => el.getBoundingClientRect().top);
    expect(examplesTop).toBeLessThan(760);

    const cookieBox = await page
      .getByRole("dialog", { name: "cookie consent" })
      .boundingBox();
    const examplesBox = await page
      .getByRole("heading", { name: "내가 원하는 스타일대로" })
      .boundingBox();
    expect(cookieBox?.x).toBeLessThan(80);
    expect(
      cookieBox && examplesBox
        ? cookieBox.y + cookieBox.height < examplesBox.y ||
            cookieBox.y > examplesBox.y + examplesBox.height ||
            cookieBox.x + cookieBox.width < examplesBox.x ||
            cookieBox.x > examplesBox.x + examplesBox.width
        : true,
    ).toBe(true);
  });

  test("login page explains what signing in unlocks", async ({ page }) => {
    await page.goto("/ko/login");

    await expect(page.getByText("단축한 링크를 한 곳에서 관리")).toBeVisible();
    await expect(page.getByText("클릭·국가·채널 통계 확인")).toBeVisible();
    await expect(page.getByText("익명 링크를 계정으로 보존")).toBeVisible();
    await expect(page.getByText("단축 링크와 클릭 흐름을 한 번에")).toBeVisible();
  });

  test("dashboard signed-out state has useful actions, not an empty wall", async ({ page }) => {
    await page.goto("/ko/dashboard");

    await expect(page.getByRole("heading", { name: "로그인이 필요해요" })).toBeVisible();
    await expect(page.getByText("내 링크 목록과 만료 예정 링크 관리")).toBeVisible();
    await expect(page.getByText("로그인하면 이런 목록이 채워져요")).toBeVisible();
    await expect(page.getByRole("link", { name: "로그인하러 가기" })).toBeVisible();
    await expect(page.getByRole("link", { name: "지금 링크 단축하기" })).toBeVisible();
  });

  test("demo stats KPI renders final numbers without a zero-count mismatch", async ({ page }) => {
    await page.goto("/ko/demo");

    await expect(page.getByText("총 클릭")).toBeVisible();
    await expect(page.getByText("1,125")).toBeVisible();
    await expect(page.getByText("698 유니크")).toBeVisible();
  });
});
