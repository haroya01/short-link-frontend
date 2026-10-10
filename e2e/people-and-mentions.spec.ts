import { expect, test, type Page } from "@playwright/test";

async function failing(page: Page, names: string) {
  await page.addInitScript((value) => window.localStorage.setItem("kurl:mock-fail", value), names);
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("a search has a people tab, and following a locked account there leaves a request", async ({ page }) => {
    await page.goto("/ko/blog?q=har");
    await page.getByRole("link", { name: "사람", exact: true }).last().click({ timeout: 30_000 });
    await expect(page).toHaveURL(/view=people/);
    const haruka = page.getByTestId("person-haruka");
    await expect(haruka).toContainText("하루카", { timeout: 30_000 });
    await expect(haruka).toContainText("@haruka");
    await expect(haruka).toContainText("도쿄에서 읽고 씁니다");
    await expect(haruka.getByRole("link").first()).toHaveAttribute("href", /\/p\/haruka$/);
    await expect(page.getByTestId("person-haruki")).toBeVisible();
    await expect(page.getByTestId("person-minji")).toHaveCount(0);

    await haruka.getByTestId("follow-button").click();
    await expect(haruka.getByTestId("follow-button")).toHaveText("요청함");
  });

  test("the people tab asks for two letters, names an empty search, and tells a failure apart", async ({ page }) => {
    await page.goto("/ko/blog?q=h&view=people");
    await expect(page.getByText("두 글자 이상 입력하면 사람을 찾아요")).toBeVisible({ timeout: 30_000 });

    await page.goto("/ko/blog?q=zz&view=people");
    await expect(page.getByText("‘zz’에 맞는 사람이 없어요")).toBeVisible({ timeout: 30_000 });

    await failing(page, "people");
    await page.goto("/ko/blog?q=har&view=people");
    await expect(page.getByText("검색하지 못했어요")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("‘har’에 맞는 사람이 없어요")).toHaveCount(0);
  });

  test("the header search puts matching people above the posts", async ({ page }) => {
    await page.goto("/ko/blog");
    await page.locator("header").getByRole("searchbox", { name: "검색" }).fill("har", { timeout: 30_000 });
    const people = page.getByRole("search").getByRole("region", { name: "사람" });
    await expect(people.getByRole("link", { name: /하루카/ })).toHaveAttribute("href", /\/p\/haruka$/, {
      timeout: 10_000,
    });
    await expect(people.getByRole("link")).toHaveCount(2);
  });

  test("the inbox and the bell narrow to mentions and replies, starting on everything", async ({ page }) => {
    await page.goto("/ko/blog/notifications");
    const main = page.locator("main");
    const all = main.getByRole("tab", { name: "전체" });
    await expect(all).toHaveAttribute("aria-selected", "true", { timeout: 30_000 });
    await expect(main.getByRole("link", { name: /haruki님이 나를 팔로우했어요/ })).toBeVisible();

    await main.getByRole("tab", { name: "멘션" }).click();
    await expect(main.getByRole("link", { name: /kazuki님이 댓글에서 나를 언급했어요/ })).toBeVisible();
    await expect(main.getByRole("link", { name: /yuna님이 내 노트에 답글을 남겼어요/ })).toBeVisible();
    await expect(main.getByRole("link", { name: /kazuki님이 내 글에 댓글을 남겼어요/ })).toBeVisible();
    await expect(main.getByRole("link", { name: /haruki님이 나를 팔로우했어요/ })).toHaveCount(0);
    await expect(main.getByRole("link", { name: /minji님 외 2명이 내 글을 좋아해요/ })).toHaveCount(0);
    await expect(main.getByTestId("follow-requests-entry")).toHaveCount(0);

    await page.reload();
    await expect(page.locator("main").getByRole("tab", { name: "전체" })).toHaveAttribute("aria-selected", "true", {
      timeout: 30_000,
    });

    await page.locator("header.vt-app-header").getByRole("button", { name: /^알림/ }).click();
    const menu = page.getByRole("menu");
    await menu.getByRole("tab", { name: "멘션" }).click();
    await expect(menu.getByRole("link", { name: /kazuki님이 댓글에서 나를 언급했어요/ })).toBeVisible();
    await expect(menu.getByRole("link", { name: /haruki님이 나를 팔로우했어요/ })).toHaveCount(0);
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the search sheet suggests people as you type", async ({ page }) => {
    await page.goto("/ko/blog");
    await page.locator("nav").getByRole("button", { name: "검색" }).click({ timeout: 30_000 });
    const sheet = page.getByRole("dialog", { name: "검색" });
    await sheet.getByRole("searchbox", { name: "검색" }).fill("하루");
    const people = sheet.getByRole("region", { name: "사람" });
    await expect(people.getByRole("link", { name: /하루카/ })).toHaveAttribute("href", /\/p\/haruka$/, {
      timeout: 10_000,
    });
    await sheet.getByRole("searchbox", { name: "검색" }).fill("하");
    await expect(people).toHaveCount(0);
  });
});
