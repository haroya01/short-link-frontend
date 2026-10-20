import { expect, test, type Page } from "@playwright/test";
import { scrollUntilPresent } from "./helpers/scroll-until";

// Mock-on lane: signed in as @dohyun. 둘러보기 shows its finite rails first and ends in the endless
// 다른 서버 stream; a search made there is remembered on this device.
test.use({ viewport: { width: 390, height: 844 } });

async function open(page: Page) {
  await page.goto("/ko/blog/explore");
  await expect(page.getByRole("searchbox", { name: "검색" })).toBeVisible({ timeout: 30_000 });
}

async function top(page: Page, testId: string) {
  const box = await page.getByTestId(testId).boundingBox();
  return box!.y;
}

test("둘러보기 lists tags, links and people to follow, then ends in 다른 서버 that keeps going", async ({ page }) => {
  await open(page);
  const remote = page.getByTestId("remote-feed");
  await expect(page.getByTestId("trending-note-tags")).toBeVisible();
  await expect(page.getByTestId("trending-note-links")).toBeVisible();
  await expect(page.getByTestId("follow-suggestions")).toBeVisible();
  await expect(remote.locator("[data-remote-uri]").first()).toBeVisible();

  const order = [
    await top(page, "trending-note-tags"),
    await top(page, "trending-note-links"),
    await top(page, "follow-suggestions"),
    await top(page, "remote-feed"),
  ];
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  await expect(page.locator("#explore-remote")).toHaveText("다른 서버");
  await expect(remote.getByRole("navigation").getByRole("link", { name: "인기" })).toHaveAttribute("aria-current", "page");

  await scrollUntilPresent(remote.locator('article[data-note-id="13"]'));
  await expect(remote.getByRole("heading", { name: "받은 노트" })).toBeVisible();
  await expect(page).toHaveURL(/\/explore$/);
});

test("최신 switches in place and stays on 둘러보기", async ({ page }) => {
  await open(page);
  const remote = page.getByTestId("remote-feed");
  await expect(remote.locator("[data-remote-uri]").first()).toBeVisible();
  await remote.getByRole("navigation").getByRole("link", { name: "최신" }).click();
  await expect(page).toHaveURL(/\/explore\?remote=latest$/);
  await expect(remote.getByRole("navigation").getByRole("link", { name: "최신" })).toHaveAttribute("aria-current", "page");
  await expect(remote.locator("[data-remote-uri]").first()).not.toContainText("에서 인기");
  await expect(page.getByTestId("trending-note-tags")).toBeVisible();
});

test("typing shows results in place of the rails, and Enter opens the full results", async ({ page }) => {
  await open(page);
  const field = page.getByRole("searchbox", { name: "검색" });
  await field.fill("kurl");
  await expect(page.getByRole("button", { name: "‘kurl’ 검색 결과" })).toBeVisible();
  await expect(page.getByTestId("remote-feed")).toHaveCount(0);
  await expect(page.getByTestId("trending-note-tags")).toHaveCount(0);

  await field.press("Enter");
  await expect(page).toHaveURL(/[?&]q=kurl/);
});

test("searches made here come back under 최근 검색, newest first, and 지우기 clears them", async ({ page }) => {
  await open(page);
  await expect(page.getByTestId("recent-searches")).toHaveCount(0);
  for (const q of ["산책", "kurl", "산책"]) {
    await page.getByRole("searchbox", { name: "검색" }).fill(q);
    await page.getByRole("searchbox", { name: "검색" }).press("Enter");
    await expect(page).toHaveURL(new RegExp(`[?&]q=${encodeURIComponent(q)}`));
    await open(page);
  }

  const recents = page.getByTestId("recent-searches");
  await expect(recents.getByRole("heading", { name: "최근 검색" })).toBeVisible();
  await expect(recents.getByRole("link")).toHaveText(["산책", "kurl"]);
  const recentsTop = (await recents.boundingBox())!.y;
  expect(recentsTop).toBeLessThan(await top(page, "trending-note-tags"));

  await recents.getByRole("link", { name: "kurl" }).click();
  await expect(page).toHaveURL(/[?&]q=kurl/);
  await open(page);
  await expect(page.getByTestId("recent-searches").getByRole("link")).toHaveText(["kurl", "산책"]);

  await page.getByRole("button", { name: "최근 검색 지우기" }).click();
  await expect(page.getByTestId("recent-searches")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("trending-note-tags")).toBeVisible({ timeout: 30_000 });
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
