import { test, expect, type Page } from "@playwright/test";
import { expectOnTop, toastBy } from "./helpers/on-top";

const header = (page: Page) => page.locator("header.vt-app-header");
const desktopTrigger = (page: Page) => header(page).locator('[data-compose-trigger="desktop"]');
const mobileTrigger = (page: Page) => header(page).locator('[data-compose-trigger="mobile"]');

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("글쓰기 opens a menu of 노트 · 긴 글 · 이어 쓰기, walked with the keyboard", async ({ page }) => {
    await page.goto("/ko/blog");
    await desktopTrigger(page).click({ timeout: 30_000 });
    const menu = page.getByRole("menu", { name: "글쓰기" });
    await expect(menu.getByRole("menuitem")).toHaveText([
      /노트짧게, 바로 올리기/,
      /긴 글제목과 본문, 임시저장하며 다듬기/,
      /작성 중인 초안/,
    ]);
    await expect(menu.getByRole("group", { name: "이어 쓰기" })).toBeVisible();
    await expect(menu.getByRole("menuitem").first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(menu.getByRole("menuitem").nth(1)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(desktopTrigger(page)).toBeFocused();
  });

  test("노트 opens the note composer over the page and the new note lands on the notes feed", async ({ page }) => {
    await page.goto("/ko/blog/notes");
    await desktopTrigger(page).click({ timeout: 30_000 });
    await page.getByRole("menuitem", { name: /노트/ }).click();
    const dialog = page.getByRole("dialog", { name: "새 노트" });
    const field = dialog.getByRole("textbox").first();
    await expect(field).toBeFocused();
    await field.fill("헤더에서 바로 쓴 노트");
    await dialog.getByRole("button", { name: "올리기" }).click();
    const notice = page.getByRole("dialog").filter({ hasText: "노트는 다른 서버에도 전해져요" });
    await notice.getByRole("button", { name: "알겠어요, 올릴게요" }).click();
    await expectOnTop(toastBy(page, "노트를 올렸어요"));
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("article", { hasText: "헤더에서 바로 쓴 노트" }).first()).toBeVisible();
    await expect(page).toHaveURL(/\/ko\/blog\/notes$/);
  });

  test("긴 글 opens the blog editor on a new post", async ({ page }) => {
    await page.goto("/ko/blog");
    await desktopTrigger(page).click({ timeout: 30_000 });
    await page.getByRole("menuitem", { name: /긴 글/ }).click();
    await page.waitForURL(/\/write\/new$/, { timeout: 30_000 });
    await expect(page.locator(".tiptap")).toBeVisible({ timeout: 30_000 });
  });

  test("a recent draft reopens in the editor with what was written", async ({ page }) => {
    await page.goto("/ko/blog");
    await desktopTrigger(page).click({ timeout: 30_000 });
    await page.getByRole("menuitem", { name: /작성 중인 초안/ }).click();
    await page.waitForURL(/\/write\/\d+$/, { timeout: 30_000 });
    await expect(page.locator(".tiptap")).toContainText("여기에 이어서 작성하세요", { timeout: 30_000 });
  });

  test("with no drafts there is no 이어 쓰기", async ({ page, context }) => {
    await context.addInitScript(() => window.localStorage.setItem("kurl:mock-no-drafts", "1"));
    await page.goto("/ko/blog");
    await desktopTrigger(page).click({ timeout: 30_000 });
    const menu = page.getByRole("menu", { name: "글쓰기" });
    await expect(menu.getByRole("menuitem")).toHaveCount(2);
    await expect(menu.getByRole("group", { name: "이어 쓰기" })).toHaveCount(0);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the compose button opens a bottom sheet with the same choices", async ({ page }) => {
    await page.goto("/ko/blog");
    await mobileTrigger(page).click({ timeout: 30_000 });
    const sheet = page.getByRole("dialog", { name: "글쓰기" });
    await expect(sheet.locator("[data-compose-choice]")).toHaveText([/노트/, /긴 글/, /작성 중인 초안/]);
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
    const box = (await sheet.locator("[data-compose-choice]").last().boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(mobileTrigger(page)).toBeFocused();
  });

  test("signed out, the compose button asks to sign in first", async ({ page, context }) => {
    await context.addInitScript(() => window.localStorage.setItem("kurl:mock-signed-out", "1"));
    await page.goto("/ko/blog");
    await header(page).getByRole("button", { name: "글쓰기" }).click({ timeout: 30_000 });
    await expect(page.getByRole("dialog", { name: "글을 쓰려면 로그인하세요" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "글쓰기" })).toHaveCount(0);
  });
});
