import { test, expect, type Page } from "@playwright/test";
import { expectOnTop, toastBy } from "./helpers/on-top";

/**
 * Blocking someone, in MOCK-ON. The mock session is @dohyun and the mock block list starts with
 * @mallory (an account with no content). Blocks live for the SPA session — a reload resets them — so
 * flows that cross pages move by soft navigation and the browser's Back.
 */
test.use({ viewport: { width: 1280, height: 900 } });

async function blockFromProfile(page: Page, username: string) {
  await page.getByRole("button", { name: "프로필 메뉴" }).click({ timeout: 30_000 });
  await page.getByRole("menuitem", { name: "차단", exact: true }).click();
  const ask = page.getByRole("dialog", { name: `${username}님을 차단할까요?` });
  await expect(ask).toContainText("서로의 팔로우와 대기 중인 팔로우 요청도 양쪽 다 끊어져요");
  await ask.getByRole("button", { name: "차단", exact: true }).click();
  await expect(page.getByText(`${username}님을 차단했어요`, { exact: false })).toBeVisible();
}

test("blocking from a profile hides their posts, notes and follow button, and unblocking brings them back", async ({ page }) => {
  await page.goto("/ko/p/yuna/notes");
  const notes = page.locator("article[data-note-id]");
  await expect(notes.first()).toBeVisible({ timeout: 30_000 });
  const follow = page.locator("header").getByTestId("follow-button");
  await expect(follow).toHaveText("팔로우");

  await blockFromProfile(page, "yuna");
  const notice = page.getByTestId("author-blocked");
  await expect(notice).toContainText("차단한 사용자예요");
  await expect(notes).toHaveCount(0);
  await expect(follow).toHaveCount(0);

  await page.getByRole("link", { name: "글", exact: true }).click();
  await expect(page).toHaveURL(/\/p\/yuna$/);
  await expect(notice).toBeVisible();
  await expect(page.locator('main a[href^="/ko/p/yuna/"][href$="kyoto-workation"]')).toHaveCount(0);

  await notice.getByRole("button", { name: "차단 해제" }).click();
  await expectOnTop(toastBy(page, "yuna님의 차단을 해제했어요"));
  await expect(notice).toHaveCount(0);
  await expect(page.locator('main a[href$="/kyoto-workation"]').first()).toBeVisible();
  await expect(follow).toHaveText("팔로우");
});

test("a blocked author's posts leave the feed the reader came from", async ({ page }) => {
  await page.goto("/ko/blog");
  const byMinji = page.locator('main li a[href="/ko/p/minji"]');
  await expect(byMinji.first()).toBeVisible({ timeout: 30_000 });
  await byMinji.first().click();
  await expect(page).toHaveURL(/\/p\/minji$/, { timeout: 30_000 });

  await blockFromProfile(page, "minji");
  await page.goBack();
  await expect(page).toHaveURL(/\/blog$/, { timeout: 30_000 });
  await expect(page.locator('main li a[href="/ko/p/sora"]').first()).toBeVisible();
  await expect(byMinji).toHaveCount(0);
});

test("a blocked commenter's comments leave the post", async ({ page }) => {
  await page.goto("/ko/p/dohyun/nextjs-14-app-router-blog");
  const kazuki = page.locator("#comment-3");
  await expect(kazuki).toContainText("kazuki", { timeout: 30_000 });
  await kazuki.getByRole("link", { name: "kazuki" }).click();
  await expect(page).toHaveURL(/\/p\/kazuki$/, { timeout: 30_000 });

  await blockFromProfile(page, "kazuki");
  await page.goBack();
  await expect(page.locator("#comment-1")).toContainText("minji", { timeout: 30_000 });
  await expect(page.locator("#comment-3")).toHaveCount(0);
  await expect(page.locator("#comment-4")).toHaveCount(0);
});

test("settings list blocked accounts and unblock them", async ({ page }) => {
  await page.goto("/ko/blog/settings");
  const section = page.getByRole("region", { name: "차단한 사용자" });
  await expect(section.getByRole("link", { name: "@mallory" })).toBeVisible({ timeout: 30_000 });
  await section.getByRole("button", { name: "mallory님 차단 해제" }).click();
  await expectOnTop(toastBy(page, "mallory님의 차단을 해제했어요"));
  await expect(section).toContainText("차단한 사용자가 없어요.");
});
