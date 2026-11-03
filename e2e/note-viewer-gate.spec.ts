import { expect, test, type Page } from "@playwright/test";

/**
 * mock-on. Note 91 is yuna's, open only to the people it mentions: @dohyun (the mock session) replied as 92.
 * The read the page server makes carries no session, so it gets the same 404 as a note that doesn't exist.
 */

const note = (page: Page, id: number) => page.locator(`article[data-note-id="${id}"]`);
const notFound = (page: Page) => page.getByRole("heading", { name: "이 글을 찾을 수 없어요" });

test("someone the note mentions opens its page and reads the note and its reply", async ({ page }) => {
  const response = await page.goto("/ko/p/yuna/notes/91");

  expect(await response!.text()).not.toContain("알림 가나요?");
  await expect(note(page, 91)).toContainText("알림 가나요?", { timeout: 30_000 });
  await expect(note(page, 92)).toContainText("잘 왔어요.");
  await expect(notFound(page)).toHaveCount(0);
  await expect(page).toHaveTitle("@yuna의 노트");
  await expect(page.locator('meta[name="robots"][content="noindex"]').first()).toBeAttached();
});

test("signed out, the same address is the 404 page", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:mock-signed-out", "1"));
  await page.goto("/ko/p/yuna/notes/91");

  await expect(notFound(page)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("article[data-note-id]")).toHaveCount(0);
});

test("a note that doesn't exist is the 404 page for a signed-in reader too", async ({ page }) => {
  await page.goto("/ko/p/yuna/notes/999999");

  await expect(notFound(page)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("article[data-note-id]")).toHaveCount(0);
});

test("an address under someone else's name moves to the writer's own", async ({ page }) => {
  await page.goto("/ko/p/haruka/notes/91");

  await expect(page).toHaveURL(/\/ko\/p\/yuna\/notes\/91$/, { timeout: 30_000 });
  await expect(note(page, 91)).toContainText("알림 가나요?");
});
