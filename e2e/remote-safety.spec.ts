import { expect, test, type Page } from "@playwright/test";
import { expectOnTop, toastBy } from "./helpers/on-top";

// Mock lane: the viewer follows mina@mastodon.social; deals@spam.example starts blocked and
// ren@mastodon.online muted; sora@fosstodon.org and aoi@mstdn.jp are suggested from elsewhere.

async function failing(page: Page, names: string) {
  await page.addInitScript((value) => window.localStorage.setItem("kurl:mock-fail", value), names);
}

async function openAccountMenu(page: Page) {
  await page.getByRole("button", { name: "계정 메뉴" }).click({ timeout: 30_000 });
}

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("blocking an account elsewhere asks first, hides its notes and follow, and unblocking brings them back", async ({
    page,
  }) => {
    await page.goto("/ko/blog/remote/9800");
    await expect(page.locator('article[data-note-id="12"]')).toBeVisible({ timeout: 30_000 });
    await openAccountMenu(page);
    await expect(page.getByRole("menuitem")).toHaveText(["뮤트…", "차단", "mastodon.social 차단"]);
    await page.getByRole("menuitem", { name: "차단", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "mina@mastodon.social님을 차단할까요?" });
    await expect(dialog).toContainText("이 계정의 노트가 더는 보이지 않아요. 서로의 팔로우도 양쪽 다 끊어져요.");
    await dialog.getByRole("button", { name: "차단", exact: true }).click();
    await expectOnTop(toastBy(page, "mina@mastodon.social님을 차단했어요. 노트가 숨겨져요"));
    await expect(page.getByText("차단한 계정이에요")).toBeVisible();
    await expect(page.locator("article[data-note-id]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "팔로잉", exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "차단 해제", exact: true }).click();
    await expectOnTop(toastBy(page, "mina@mastodon.social님의 차단을 해제했어요"));
    await expect(page.getByText("차단한 계정이에요")).toHaveCount(0);
    await expect(page.locator('article[data-note-id="12"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "팔로우", exact: true })).toBeVisible();
  });

  test("muting an account elsewhere uses the same dialog and keeps its notes on its page", async ({ page }) => {
    await page.goto("/ko/blog/remote/9800");
    await expect(page.locator('article[data-note-id="12"]')).toBeVisible({ timeout: 30_000 });
    await openAccountMenu(page);
    await page.getByRole("menuitem", { name: "뮤트…" }).click();

    const dialog = page.getByRole("dialog", { name: "mina@mastodon.social님 뮤트" });
    await expect(dialog).toContainText("피드와 답글에서 숨겨져요. 계정 화면에서는 그대로 보이고");
    await expect(dialog.getByRole("checkbox", { name: "알림도 숨기기" })).toBeChecked();
    await dialog.getByRole("combobox", { name: "기간" }).selectOption("86400");
    await dialog.getByRole("button", { name: "뮤트", exact: true }).click();
    await expectOnTop(toastBy(page, "mina@mastodon.social님을 뮤트했어요"));
    await expect(page.locator('article[data-note-id="12"]')).toBeVisible();

    await openAccountMenu(page);
    await page.getByRole("menuitem", { name: "뮤트 해제" }).click();
    await expectOnTop(toastBy(page, "mina@mastodon.social님의 뮤트를 해제했어요"));
  });

  test("a block elsewhere that fails says so and leaves the notes", async ({ page }) => {
    await failing(page, "remote-block");
    await page.goto("/ko/blog/remote/9800");
    await expect(page.locator('article[data-note-id="12"]')).toBeVisible({ timeout: 30_000 });
    await openAccountMenu(page);
    await page.getByRole("menuitem", { name: "차단", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "차단", exact: true }).click();
    await expectOnTop(toastBy(page, "차단하지 못했어요"));
    await expect(page.locator('article[data-note-id="12"]')).toBeVisible();
  });

  test("settings list blocked and muted accounts elsewhere under their own label, each with a way back", async ({
    page,
  }) => {
    await page.goto("/ko/blog/settings");
    const blocked = page.getByRole("region", { name: "차단한 사용자" });
    const blockedElsewhere = blocked.getByTestId("remote-blocks");
    await expect(blockedElsewhere).toContainText("@deals@spam.example", { timeout: 30_000 });
    await expect(blocked.getByRole("heading", { level: 3, name: "다른 서버" })).toBeVisible();
    await expect(blocked).toContainText("@mallory");
    await blocked.getByRole("button", { name: "deals@spam.example님 차단 해제" }).click();
    await expectOnTop(toastBy(page, "deals@spam.example님의 차단을 해제했어요"));
    await expect(blockedElsewhere).toHaveCount(0);
    await expect(blocked.getByRole("heading", { level: 3, name: "다른 서버" })).toHaveCount(0);
    await expect(blocked).toContainText("@mallory");

    const muted = page.getByRole("region", { name: "뮤트한 사용자" });
    await expect(muted.getByTestId("muted-users")).toContainText("@haruki");
    await expect(muted.getByTestId("muted-users")).toContainText("무기한");
    await expect(muted.getByTestId("remote-mutes")).toContainText("@ren@mastodon.online");
    await muted.getByRole("button", { name: "ren@mastodon.online님 뮤트 해제" }).click();
    await expectOnTop(toastBy(page, "ren@mastodon.online님의 뮤트를 해제했어요"));
    await expect(muted.getByTestId("remote-mutes")).toHaveCount(0);
    await expect(muted.getByTestId("muted-users")).toContainText("@haruki");
  });

  test("settings keep only the members when the lists elsewhere cannot be read", async ({ page }) => {
    await failing(page, "remote-blocks,remote-mutes");
    await page.goto("/ko/blog/settings");
    const muted = page.getByRole("region", { name: "뮤트한 사용자" });
    await expect(muted.getByTestId("muted-users")).toContainText("@haruki", { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 3, name: "다른 서버" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "차단한 사용자" })).toContainText("@mallory");
  });

  test("the header search lists a few people elsewhere under the people here, and none for a handle", async ({
    page,
  }) => {
    await page.goto("/ko/blog");
    const field = page.locator("header").getByRole("searchbox", { name: "검색" });
    await field.fill("har", { timeout: 30_000 });
    const search = page.getByRole("search");
    const here = search.getByRole("region", { name: "사람" });
    const elsewhere = search.getByRole("region", { name: "다른 서버" });
    await expect(elsewhere.getByRole("link", { name: /@haruto@misskey\.io/ })).toHaveAttribute("href", /\/remote\/9801$/, {
      timeout: 10_000,
    });
    await expect(here.getByRole("link")).toHaveCount(2);
    const top = (await here.boundingBox())!.y;
    expect((await elsewhere.boundingBox())!.y).toBeGreaterThan(top);

    await field.fill("@mina@mastodon.social");
    await expect(elsewhere).toHaveCount(0);

    await field.fill("har");
    await elsewhere.getByRole("link", { name: /@haruto@misskey\.io/ }).click({ timeout: 10_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Haruto" })).toBeVisible({ timeout: 30_000 });
  });

  test("the header search keeps the people here when the search elsewhere fails", async ({ page }) => {
    await failing(page, "remote-search");
    await page.goto("/ko/blog");
    await page.locator("header").getByRole("searchbox", { name: "검색" }).fill("har", { timeout: 30_000 });
    const search = page.getByRole("search");
    await expect(search.getByRole("region", { name: "사람" }).getByRole("link")).toHaveCount(2, { timeout: 10_000 });
    await expect(search.getByRole("region", { name: "다른 서버" })).toHaveCount(0);
  });

  test("a note's @ offers accounts elsewhere after the people here and fills the full handle", async ({ page }) => {
    await page.goto("/ko/blog/notes");
    const composer = page.getByRole("textbox", { name: "노트 쓰기" });
    await expect(composer).toBeVisible({ timeout: 30_000 });
    await composer.click();
    await page.keyboard.type("오늘 @mi");
    const list = page.getByTestId("mention-suggestions");
    await expect(list.getByRole("option")).toHaveCount(2);
    await expect(list.getByRole("option").nth(0)).toContainText("@minji");
    await expect(list.getByRole("option").nth(1)).toContainText("@mina@mastodon.social");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(composer).toHaveValue("오늘 @mina@mastodon.social ");
    await expect(list).toHaveCount(0);
  });

  test("follow suggestions beside the feed add accounts elsewhere with their server and a follow", async ({ page }) => {
    await page.goto("/ko/blog/notes");
    const rail = page.getByTestId("follow-suggestions");
    await expect(rail.getByTestId("suggestion-haruka")).toBeVisible({ timeout: 30_000 });
    const elsewhere = rail.getByTestId("remote-suggestions");
    await expect(elsewhere.getByRole("heading", { level: 3, name: "다른 서버" })).toBeVisible();
    const sora = elsewhere.getByTestId("remote-suggestion-sora@fosstodon.org");
    await expect(sora).toContainText("@sora@fosstodon.org");
    await expect(sora.getByRole("link")).toHaveAttribute("href", /\/remote\/9802$/);
    await sora.getByRole("button", { name: "팔로우" }).click();
    await expect(sora.getByRole("button", { name: "요청됨" })).toBeVisible();
  });

  test("a note search finds notes from other servers and opens them on the remote note page", async ({ page }) => {
    await page.goto("/ko/blog?q=fediverse&view=notes");
    const note = page.locator('article[data-note-id="12"]');
    await expect(note).toContainText("Hello from the fediverse", { timeout: 30_000 });
    await expect(note.getByRole("link", { name: "Mina @mina@mastodon.social" })).toHaveAttribute(
      "href",
      /\/remote\/9800$/,
    );
    await note.getByText("Hello from the fediverse").click();
    await expect(page).toHaveURL(/\/remote\/9800\/notes\/12$/, { timeout: 30_000 });
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the search sheet lists people elsewhere under the people here", async ({ page }) => {
    await page.goto("/ko/blog");
    await page.locator("nav").getByRole("button", { name: "검색" }).click({ timeout: 30_000 });
    const sheet = page.getByRole("dialog", { name: "검색" });
    await sheet.getByRole("searchbox", { name: "검색" }).fill("har");
    const elsewhere = sheet.getByRole("region", { name: "다른 서버" });
    await expect(elsewhere.getByRole("link", { name: /@haruto@misskey\.io/ })).toHaveAttribute("href", /\/remote\/9801$/, {
      timeout: 10_000,
    });
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("the account menu, the blocked account line and the settings lists fit a phone", async ({ page }) => {
    await page.goto("/ko/blog/remote/9800");
    await expect(page.locator('article[data-note-id="12"]')).toBeVisible({ timeout: 30_000 });
    await openAccountMenu(page);
    await expect(page.getByRole("menuitem", { name: "mastodon.social 차단" })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);

    await page.goto("/ko/blog/remote/9804");
    await expect(page.getByText("차단한 계정이에요")).toBeVisible({ timeout: 30_000 });
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await openAccountMenu(page);
    await expect(page.getByRole("menuitem", { name: "차단 해제", exact: true })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);

    await page.goto("/ko/blog/settings");
    await expect(page.getByTestId("remote-mutes")).toBeVisible({ timeout: 30_000 });
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});
