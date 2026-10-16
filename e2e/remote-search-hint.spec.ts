import { expect, test, type Page } from "@playwright/test";

const HINT = "다른 서버 사람은 @아이디@서버 주소로 찾을 수 있어요";

async function openSheet(page: Page) {
  await page.goto("/ko/blog");
  await page.locator("nav.vt-bottom-nav").getByRole("button", { name: "검색" }).click({ timeout: 30_000 });
  const sheet = page.getByRole("dialog", { name: "검색" });
  return { sheet, box: sheet.getByRole("searchbox", { name: "검색" }) };
}

test.describe("phone search sheet", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a name nobody elsewhere matches says how to find someone there, in the other servers' place", async ({
    page,
  }) => {
    const { sheet, box } = await openSheet(page);
    await box.fill("zz");
    const hint = sheet.getByTestId("live-remote-hint");
    await expect(hint).toHaveText(HINT, { timeout: 10_000 });
    await expect(hint.locator("svg")).toHaveCount(0);
    expect(await hint.evaluate((el) => getComputedStyle(el).color)).not.toMatch(/\((4, 120, 87|5, 150, 105|16, 185, 129)/);
    await expect(sheet.getByTestId("live-remote-people")).toHaveCount(0);
  });

  test("the hint gives way to accounts elsewhere and to a handle being looked up", async ({ page }) => {
    const { sheet, box } = await openSheet(page);
    await box.fill("har");
    await expect(sheet.getByTestId("live-remote-people").getByRole("link", { name: /@haruto@misskey\.io/ })).toBeVisible({
      timeout: 10_000,
    });
    await expect(sheet.getByTestId("live-remote-hint")).toHaveCount(0);

    await box.fill("@mina@mastodon.social");
    await expect(sheet.getByTestId("live-remote-people").getByRole("link", { name: /@mina@mastodon\.social/ })).toBeVisible({
      timeout: 10_000,
    });
    await expect(sheet.getByTestId("live-remote-hint")).toHaveCount(0);
  });
});

test("the header search shows the same hint for a name nobody elsewhere matches", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/ko/blog");
  await page.locator("header").getByRole("searchbox", { name: "검색" }).fill("zz", { timeout: 30_000 });
  await expect(page.getByRole("search").getByTestId("live-remote-hint")).toHaveText(HINT, { timeout: 10_000 });
});
