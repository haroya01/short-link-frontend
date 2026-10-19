import { test, expect, type Page } from "@playwright/test";
import { expectOnTop, toastBy } from "./helpers/on-top";

// Mock-on lane at phone width: the session is @dohyun. The notes rails that sit beside the feed only on
// wide screens come to the search sheet here, in the app's order, and the feed's ⋯ menu carries 복사
// and 신고 as the app's does.
test.use({ viewport: { width: 390, height: 844 } });

async function openSearch(page: Page) {
  await page.goto("/ko/blog/notes");
  await page.locator("nav.vt-bottom-nav").getByRole("button", { name: "검색" }).click({ timeout: 30_000 });
  return page.getByRole("dialog", { name: "검색" });
}

test("the resting search sheet carries trending posts, follow suggestions, hashtags and links in the app's order", async ({ page }) => {
  const sheet = await openSearch(page);
  await expect(sheet.getByTestId("trending-note-links")).toBeVisible({ timeout: 30_000 });
  await expect(sheet.getByTestId("follow-suggestions").getByTestId("suggestion-haruka")).toBeVisible();
  const rails = sheet.locator(
    "[data-testid='search-idle-trending'], [data-testid='follow-suggestions'], [data-testid='trending-note-tags'], [data-testid='trending-note-links']",
  );
  await expect(rails.locator(":scope > h2")).toHaveText(["지금 뜨는 글", "팔로우 추천", "뜨는 해시태그", "뜨는 링크"]);
  await expect(sheet.getByTestId("search-idle-follow")).toHaveCount(0);

  await sheet.getByTestId("trending-note-tags").getByRole("link", { name: /#산책/ }).click();
  await expect(page.getByRole("dialog", { name: "검색" })).toHaveCount(0);
  await expect(page).toHaveURL(/\/tags\/%EC%82%B0%EC%B1%85/);
});

test("signed out, the sheet keeps the blog's writers to follow in place of the note suggestions", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:mock-signed-out", "1"));
  const sheet = await openSearch(page);
  await expect(sheet.getByTestId("search-idle-follow")).toBeVisible({ timeout: 30_000 });
  await expect(sheet.getByTestId("trending-note-tags")).toBeVisible();
  await expect(sheet.getByTestId("follow-suggestions")).toHaveCount(0);
});

test("a note's ⋯ menu copies its text and reports it", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/ko/blog/notes");
  const lunch = page.locator('article[data-note-id="10"]');
  await expect(lunch).toBeVisible({ timeout: 30_000 });
  await lunch.getByRole("button", { name: "노트 메뉴" }).click();
  const items = lunch.getByRole("menuitem");
  await expect(items.first()).toHaveText("복사");
  await expect(items.last()).toHaveText("신고");
  await lunch.getByRole("menuitem", { name: "복사" }).click();
  await expectOnTop(toastBy(page, "복사했어요"));
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("회고 끝나고 점심 어디서 먹을까요?");

  await lunch.getByRole("button", { name: "노트 메뉴" }).click();
  await lunch.getByRole("menuitem", { name: "신고" }).click();
  const report = page.getByRole("dialog", { name: "이 노트 신고" });
  await expectOnTop(report);
  await report.getByLabel("스팸·광고").check();
  await report.getByRole("button", { name: "신고", exact: true }).click();
  await expectOnTop(toastBy(page, "신고가 접수됐어요."));
});

test("my own note's ⋯ menu copies but offers no report", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const mine = page.locator('article[data-note-id="6"]');
  await expect(mine).toBeVisible({ timeout: 30_000 });
  await mine.getByRole("button", { name: "노트 메뉴" }).click();
  await expect(mine.getByRole("menuitem", { name: "복사" })).toBeVisible();
  await expect(mine.getByRole("menuitem", { name: "신고" })).toHaveCount(0);
});
