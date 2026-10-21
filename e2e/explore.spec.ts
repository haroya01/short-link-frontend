import { expect, test, type Locator, type Page } from "@playwright/test";
import { scrollUntilPresent } from "./helpers/scroll-until";

// Mock-on lane: signed in as @dohyun. 둘러보기 is a search box over three lanes, 추천 · 다른 서버 · 사람.
// 추천 is kurl's trending posts in the home row with follow cards after the third, then the endless
// 다른 서버 stream; recent searches and hashtags wait behind the search box.
test.use({ viewport: { width: 390, height: 844 } });

async function open(page: Page, path = "/ko/blog/explore") {
  await page.goto(path);
  await expect(page.getByRole("searchbox", { name: "검색" })).toBeVisible({ timeout: 30_000 });
}

async function top(locator: Locator) {
  return (await locator.boundingBox())!.y;
}

test("추천 leads with kurl posts in the home row, follow cards after the third, then 다른 서버 that keeps going", async ({
  page,
}) => {
  await open(page);
  await expect(page.getByRole("tab")).toHaveText(["추천", "다른 서버", "사람"]);
  await expect(page.getByRole("tab", { name: "추천" })).toHaveAttribute("aria-selected", "true");
  const picks = page.getByTestId("explore-picks");
  const posts = picks.locator("[data-post-id]");
  await expect(posts.first().locator("[data-home-post-body]")).toBeVisible({ timeout: 30_000 });

  const strip = picks.getByTestId("explore-people-strip");
  await expect(strip.getByTestId("explore-person-haruka")).toContainText("내가 팔로우하는 3명이 팔로우");
  await expect(strip.getByTestId("explore-person-haruka").getByTestId("follow-button")).toHaveText("팔로우");
  const stripTop = await top(strip);
  expect(await top(posts.nth(2))).toBeLessThan(stripTop);
  expect(await top(posts.nth(3))).toBeGreaterThan(stripTop);

  const remote = picks.getByTestId("remote-feed");
  expect(await top(remote)).toBeGreaterThan(await top(posts.last()));
  await scrollUntilPresent(remote.locator('article[data-note-id="13"]'));
  await expect(remote.getByRole("heading", { name: "받은 노트" })).toBeVisible();
  await expect(page).toHaveURL(/\/explore$/);
});

test("lanes switch in place under a head that does not move, and the URL keeps the lane", async ({ page }) => {
  await open(page);
  const head = page.locator("[data-explore-head]");
  await expect(page.getByTestId("explore-picks").locator("[data-post-id]").first()).toBeVisible({ timeout: 30_000 });
  const before = await head.boundingBox();

  await page.getByRole("tab", { name: "다른 서버" }).click();
  await expect(page).toHaveURL(/\/explore\?lane=remote$/);
  await expect(page.getByRole("tab", { name: "다른 서버" })).toHaveAttribute("aria-selected", "true");
  const latest = page.locator('[data-explore-lane="remote"] [data-testid="remote-feed"]');
  await expect(latest).toHaveAttribute("data-remote-view", "latest");
  await expect(latest.locator("[data-remote-uri]").first()).toBeVisible();
  await expect(latest.locator("[data-remote-uri]").first()).not.toContainText("에서 인기");
  await expect(page.getByTestId("explore-picks")).toBeHidden();
  expect(await head.boundingBox()).toEqual(before);

  await page.getByRole("tab", { name: "사람" }).click();
  await expect(page).toHaveURL(/\/explore\?lane=people$/);
  await expect(page.getByTestId("follow-suggestions").getByTestId("suggestion-yuna")).toBeVisible();
  expect(await head.boundingBox()).toEqual(before);

  await page.getByRole("tab", { name: "추천" }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByTestId("explore-picks").locator("[data-post-id]").first()).toBeVisible({ timeout: 1_000 });

  await open(page, "/ko/blog/explore?lane=people");
  await expect(page.getByRole("tab", { name: "사람" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("explore-picks")).toHaveCount(0);
});

test("더 보기 on the follow cards opens 사람 with every suggestion", async ({ page }) => {
  await open(page);
  const strip = page.getByTestId("explore-people-strip");
  await expect(strip).toBeVisible({ timeout: 30_000 });
  await strip.getByRole("button", { name: "더 보기" }).click();
  await expect(page.getByRole("tab", { name: "사람" })).toHaveAttribute("aria-selected", "true");
  const suggestions = page.getByTestId("follow-suggestions");
  await expect(suggestions.locator("[data-testid^='suggestion-']:not([data-testid^='suggestion-dismiss'])")).toHaveCount(3);
  await expect(page.getByTestId("explore-writers").getByRole("heading", { name: "작가" })).toBeVisible();
});

test("typing hides the lanes for the results, and Enter opens the full results", async ({ page }) => {
  await open(page);
  const field = page.getByRole("searchbox", { name: "검색" });
  await field.fill("kurl");
  await expect(page.getByRole("button", { name: "‘kurl’ 검색 결과" })).toBeVisible();
  await expect(page.getByRole("tablist")).toBeHidden();
  await expect(page.getByTestId("explore-picks")).toBeHidden();

  await field.fill("");
  await expect(page.getByRole("tablist")).toBeVisible();
  await field.fill("kurl");
  await field.press("Enter");
  await expect(page).toHaveURL(/[?&]q=kurl/);
});

test("recent searches and hashtags show only while the search box has focus", async ({ page }) => {
  await open(page);
  for (const q of ["산책", "kurl", "산책"]) {
    await page.getByRole("searchbox", { name: "검색" }).fill(q);
    await page.getByRole("searchbox", { name: "검색" }).press("Enter");
    await expect(page).toHaveURL(new RegExp(`[?&]q=${encodeURIComponent(q)}`));
    await open(page);
  }

  const recents = page.getByTestId("recent-searches");
  const tags = page.getByTestId("explore-tag-chips");
  await expect(recents).toBeHidden();
  await expect(tags).toBeHidden();

  const field = page.getByRole("searchbox", { name: "검색" });
  await field.focus();
  await expect(recents.getByRole("heading", { name: "최근 검색" })).toBeVisible();
  await expect(recents.getByRole("link")).toHaveText(["산책", "kurl"]);
  await expect(tags.getByRole("link")).toContainText(["#산책", "#kurl"]);
  await expect(tags.getByRole("link", { name: "#산책" })).toHaveCount(1);
  await expect
    .poll(async () => {
      const chips = (await tags.boundingBox())!;
      return (await top(page.getByRole("tablist"))) - (chips.y + chips.height);
    })
    .toBeGreaterThan(0);

  await recents.getByRole("button", { name: "kurl 지우기" }).click();
  await expect(recents.getByRole("link")).toHaveText(["산책"]);
  await expect(field).toBeFocused();

  await page.getByRole("tab", { name: "다른 서버" }).click();
  await expect(recents).toBeHidden();

  await field.focus();
  await recents.getByRole("link", { name: "산책" }).click();
  await expect(page).toHaveURL(/[?&]q=%EC%82%B0%EC%B1%85/);
  await open(page);
  await field.focus();
  await page.getByRole("button", { name: "최근 검색 지우기" }).click();
  await expect(page.getByTestId("recent-searches")).toHaveCount(0);
  await page.reload();
  await expect(field).toBeVisible({ timeout: 30_000 });
  await field.focus();
  await expect(page.getByTestId("recent-searches")).toHaveCount(0);
});

test("the notifications 멘션 tab starts with a row to 개인 멘션; 전체 does not", async ({ page }) => {
  await page.goto("/ko/blog/notifications");
  await expect(page.getByTestId("notification-tab-all")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("direct-mentions-entry")).toHaveCount(0);

  await page.getByTestId("notification-tab-mentions").click();
  const row = page.getByTestId("direct-mentions-entry");
  await expect(row).toHaveText("개인 멘션");
  const rowBox = (await row.boundingBox())!;
  const tabsBox = (await page.getByRole("tablist").boundingBox())!;
  expect(rowBox.y).toBeGreaterThan(tabsBox.y);

  await row.click();
  await expect(page).toHaveURL(/\/notes\?feed=direct$/);
});
