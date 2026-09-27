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
        await page.waitForFunction(() => document.querySelector("link[data-pretendard]")?.getAttribute("media") === "all");
        await page.evaluate(() => document.fonts.load('700 40px "Pretendard Variable"', "단축은 한 줄 클릭은 언제, 어디서"));
        await page.evaluate(() => document.fonts.ready);

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

    const banner = page.getByRole("region", { name: "쿠키 안내" });
    await expect(banner).toBeVisible();

    const box = await banner.locator("> div").boundingBox();
    expect(box?.height).toBeLessThanOrEqual(100);
  });

  test("showcase hero CTA is visible before examples on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/ko/showcase");

    await expect(page.getByRole("heading", { name: /내 프로필도 5분이면 완성/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /내 프로필 만들기/ })).toBeVisible();

    const examplesTop = await page
      .getByRole("heading", { name: "내가 원하는 스타일대로" })
      .evaluate((el) => el.getBoundingClientRect().top);
    expect(examplesTop).toBeLessThan(760);

    const cookieBox = await page
      .getByRole("region", { name: "쿠키 안내" })
      .locator("> div")
      .boundingBox();
    const examplesBox = await page
      .getByRole("heading", { name: "내가 원하는 스타일대로" })
      .boundingBox();
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

    await expect(page.getByText("로그인하면 내 링크 관리와 클릭 통계 분석 기능을 쓸 수 있어요.")).toBeVisible();
    await expect(page.getByRole("link", { name: "로그인 없이 단축만 사용하기" })).toBeVisible();
  });

  test("dashboard signed-out state has useful actions, not an empty wall", async ({ page }) => {
    await page.goto("/ko/dashboard");

    await expect(page.getByRole("heading", { name: "로그인이 필요해요" })).toBeVisible();
    await expect(page.getByText("내 링크 목록과 만료 예정 링크 관리")).toBeVisible();
    await expect(page.getByText("클릭 추이·유입 채널·기기 통계")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "로그인", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "로그인 없이 둘러보기" })).toBeVisible();
  });

  test("demo stats masthead renders final numbers without a zero-count mismatch", async ({ page }) => {
    await page.goto("/ko/demo");

    const masthead = page.locator("dl").first();
    await expect(masthead.getByText("사람 클릭")).toBeVisible();
    await expect(masthead.getByText("1,125")).toBeVisible();
    await expect(masthead.getByText("1,309")).toBeVisible();
    await expect(masthead.getByText("698")).toBeVisible();
  });

  test("demo journal sentence unfolds its evidence inline", async ({ page }) => {
    await page.goto("/ko/demo");

    await expect(page.getByText("주목할 변화")).toBeVisible();
    const row = page.locator('button[aria-controls^="journal-evidence-"]').first();
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    // 접이가 실제로 펼쳐지면 근거 패널 안의 챕터 점프 링크가 보인다.
    await expect(page.getByRole("button", { name: "상세 보기" }).first()).toBeVisible();
  });
});
