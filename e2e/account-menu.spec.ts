import { expect, test, type Page } from "@playwright/test";

// mock-on 레인: 목 세션은 @dohyun(표시 이름 "Dohyun Kim")이다. kurl:mock-empty=displayName 을 심으면 표시 이름이 없다.

const AUTHOR_PAGE = /\/ko\/p\/dohyun$/;

async function openMenu(page: Page) {
  await page.goto("/ko/blog");
  await page.getByRole("button", { name: "계정", exact: true }).click();
  return page.getByRole("menu");
}

test.describe("desktop account menu", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the top row is my author page, and 블로그·프로필 rows are gone", async ({ page }) => {
    const menu = await openMenu(page);
    const me = menu.getByRole("menuitem").first();
    await expect(me).toHaveAccessibleName(/Dohyun Kim\s*@dohyun/);
    await expect(me).toHaveAttribute("href", AUTHOR_PAGE);
    await expect(menu.getByRole("menuitem", { name: "블로그", exact: true })).toHaveCount(0);
    await expect(menu.getByRole("menuitem", { name: "프로필", exact: true })).toHaveCount(0);
    await expect(menu.locator('a[href*="/u/"]')).toHaveCount(0);
    await expect(menu).not.toContainText("dohyun@kurl.me");

    await me.click();
    await expect(page).toHaveURL(AUTHOR_PAGE);
    await expect(page.getByRole("heading", { level: 1, name: "dohyun", exact: true })).toBeVisible();
  });

  test("without a display name the top row is the @handle alone", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("kurl:mock-empty", "displayName"));
    const menu = await openMenu(page);
    const me = menu.getByRole("menuitem").first();
    await expect(me).toHaveAccessibleName("@dohyun");
    await expect(me).toHaveAttribute("href", AUTHOR_PAGE);
    await expect(menu).not.toContainText("Dohyun Kim");
  });

  test("스튜디오 opens my posts and 설정 opens blog settings", async ({ page }) => {
    let menu = await openMenu(page);
    await expect(menu.getByRole("menuitem")).toHaveText([
      /Dohyun Kim\s*@dohyun/,
      "스튜디오",
      "분석",
      "내 컬렉션",
      "서재",
      "노트 북마크",
      "리스트",
      "설정",
      "로그아웃",
    ]);

    await menu.getByRole("menuitem", { name: "스튜디오", exact: true }).click();
    await expect(page).toHaveURL(/\/write$/);
    await expect(page.getByRole("heading", { level: 1, name: "내 글", exact: true })).toBeVisible();

    menu = await openMenu(page);
    await menu.getByRole("menuitem", { name: "설정", exact: true }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole("heading", { level: 1, name: "설정", exact: true })).toBeVisible();
  });

  test("choosing the top row closes the menu", async ({ page }) => {
    const menu = await openMenu(page);
    await page.evaluate(() => document.addEventListener("click", (e) => e.preventDefault(), { once: true }));
    await menu.getByRole("menuitem").first().click();
    await expect(page.getByRole("menu")).toHaveCount(0);
  });
});

test("the mobile account sheet opens my author page from the top row", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ko/blog");
  await page.getByRole("button", { name: "계정", exact: true }).click();
  const sheet = page.getByRole("dialog");
  const me = sheet.getByRole("link", { name: /Dohyun Kim\s*@dohyun/ });
  await expect(me).toHaveAttribute("href", AUTHOR_PAGE);
  await expect(sheet.getByRole("link", { name: "블로그", exact: true })).toHaveCount(0);
  await expect(sheet.getByRole("link", { name: "프로필", exact: true })).toHaveCount(0);
  await expect(sheet.locator('a[href*="/u/"]')).toHaveCount(0);
  await expect(sheet).not.toContainText("dohyun@kurl.me");

  await me.click();
  await expect(page).toHaveURL(AUTHOR_PAGE);
});

test("the mobile account sheet names my posts 스튜디오 and links 설정", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ko/blog");
  await page.getByRole("button", { name: "계정", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("link", { name: "스튜디오", exact: true })).toHaveAttribute("href", /\/write$/);
  await expect(sheet.getByRole("link", { name: "글", exact: true })).toHaveCount(0);
  await expect(sheet.getByRole("link", { name: "설정", exact: true })).toHaveAttribute("href", /\/settings$/);

  await sheet.getByRole("link", { name: "스튜디오", exact: true }).click();
  await expect(page).toHaveURL(/\/write$/);
  await expect(page.getByRole("heading", { level: 1, name: "내 글", exact: true })).toBeVisible();
});

test("모아 둔 것 groups 서재, 노트 북마크 and 리스트, and only 서재 carries the bookmark icon", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ko/blog");
  await page.getByRole("button", { name: "계정", exact: true }).click();
  const group = page.getByRole("dialog").getByRole("group", { name: "모아 둔 것" });
  await expect(group.getByRole("link")).toHaveText(["서재", "노트 북마크", "리스트"]);
  await expect(group.getByRole("link", { name: "서재" })).toHaveAttribute("href", /\/curation$/);
  await expect(group.getByRole("link", { name: "노트 북마크" })).toHaveAttribute("href", /\/notes\?feed=bookmarks$/);
  await expect(group.getByRole("link", { name: "리스트" })).toHaveAttribute("href", /\/notes\?feed=lists$/);
  await expect(group.locator("svg")).toHaveCount(1);

  await group.getByRole("link", { name: "노트 북마크" }).click();
  await expect(page).toHaveURL(/\/notes\?feed=bookmarks$/);
});

test.describe("desktop 모아 둔 것", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the account menu carries the same 모아 둔 것 group", async ({ page }) => {
    const menu = await openMenu(page);
    const group = menu.getByRole("group", { name: "모아 둔 것" });
    await expect(group.getByRole("menuitem")).toHaveText(["서재", "노트 북마크", "리스트"]);
    await expect(group.getByRole("menuitem", { name: "리스트" })).toHaveAttribute("href", /\/notes\?feed=lists$/);
    await expect(group.locator("svg")).toHaveCount(1);
  });
});
