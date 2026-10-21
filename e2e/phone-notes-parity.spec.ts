import { test, expect, type Page } from "@playwright/test";
import { expectOnTop, toastBy } from "./helpers/on-top";

// Mock-on lane at phone width: the session is @dohyun. 둘러보기 is three lanes under the search box,
// with the people to follow in 사람 and the hashtags behind the search box, and the feed's ⋯ menu
// carries 복사 and 신고 as the app's does.
test.use({ viewport: { width: 390, height: 844 } });

async function openExplore(page: Page) {
  await page.goto("/ko/blog/explore");
  const main = page.locator("main");
  await expect(main.getByRole("searchbox", { name: "검색" })).toBeVisible({ timeout: 30_000 });
  return main;
}

test("둘러보기 keeps follow suggestions in 사람 and hashtags behind the search box, in the app's order", async ({ page }) => {
  const explore = await openExplore(page);
  await expect(explore.getByRole("tab")).toHaveText(["추천", "다른 서버", "사람"]);
  await explore.getByRole("tab", { name: "사람" }).click();
  await expect(explore.getByTestId("follow-suggestions").getByTestId("suggestion-haruka")).toBeVisible({ timeout: 30_000 });
  await expect(explore.getByTestId("explore-writers").getByRole("heading")).toHaveText("작가");
  await expect(explore.getByTestId("explore-tag-chips")).toBeHidden();

  await explore.getByRole("searchbox", { name: "검색" }).focus();
  const chips = explore.getByTestId("explore-tag-chips");
  await expect(chips).toBeVisible();
  await chips.getByRole("link", { name: "#산책" }).click();
  await expect(page).toHaveURL(/\/tags\/%EC%82%B0%EC%B1%85\?view=notes/);
});

test("signed out, 둘러보기 offers the blog's writers in place of the note suggestions", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:mock-signed-out", "1"));
  const explore = await openExplore(page);
  await expect(explore.getByTestId("explore-people-strip").getByRole("listitem").first()).toContainText("글", {
    timeout: 30_000,
  });
  await explore.getByRole("tab", { name: "사람" }).click();
  await expect(explore.getByTestId("explore-writers")).toBeVisible();
  await expect(explore.getByTestId("follow-suggestions")).toHaveCount(0);
});

test("a note's ⋯ menu copies its text and reports it", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/ko/blog");
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
  await page.goto("/ko/blog");
  const mine = page.locator('article[data-note-id="6"]');
  await expect(mine).toBeVisible({ timeout: 30_000 });
  await mine.getByRole("button", { name: "노트 메뉴" }).click();
  await expect(mine.getByRole("menuitem", { name: "복사" })).toBeVisible();
  await expect(mine.getByRole("menuitem", { name: "신고" })).toHaveCount(0);
});
