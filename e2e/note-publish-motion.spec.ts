import { test, expect, type Locator, type Page } from "@playwright/test";

// Mock-on lane: the session is @dohyun. After 올리기 the new note settles into the top of the feed that
// shows it: it enters from 16px above while fading in (450ms), then a row-highlight wash fades out over
// 1.2s, on the house curve. Reduced motion keeps the wash only. No toast.
const desktopTrigger = (page: Page) => page.locator('header.vt-app-header [data-compose-trigger="desktop"]');

const motion = (row: Locator) =>
  row.evaluate((el) => {
    const style = getComputedStyle(el);
    return { names: style.animationName, durations: style.animationDuration, easing: style.animationTimingFunction };
  });

async function postFromHeader(page: Page, text: string) {
  await desktopTrigger(page).click({ timeout: 30_000 });
  await page.getByRole("menuitem", { name: /노트/ }).click();
  const dialog = page.getByRole("dialog", { name: "새 노트" });
  await dialog.getByRole("textbox").first().fill(text);
  await dialog.getByRole("button", { name: "올리기" }).click();
  const notice = page.getByRole("dialog").filter({ hasText: "노트는 다른 서버에도 전해져요" });
  await notice.getByRole("button", { name: "알겠어요, 올릴게요" }).click();
}

test.use({ viewport: { width: 1280, height: 900 } });

test("a note posted from the feed's composer settles in at the top", async ({ page }) => {
  await page.goto("/ko/blog");
  const composer = page.getByRole("textbox", { name: "노트 쓰기" });
  await composer.fill("피드에서 쓴 노트", { timeout: 30_000 });
  await page.getByRole("button", { name: "올리기" }).click();
  const notice = page.getByRole("dialog").filter({ hasText: "노트는 다른 서버에도 전해져요" });
  await notice.getByRole("button", { name: "알겠어요, 올릴게요" }).click();

  const row = page.locator("article", { hasText: "피드에서 쓴 노트" }).first();
  await expect(row).toBeVisible();
  await expect(page.locator("article[data-note-id]").first()).toContainText("피드에서 쓴 노트");
  expect(await motion(row)).toEqual({
    names: "note-arrive, note-wash",
    durations: "0.45s, 1.2s",
    easing: "cubic-bezier(0.16, 1, 0.3, 1), cubic-bezier(0.16, 1, 0.3, 1)",
  });
  await expect(toastBy(page)).toHaveCount(0);
});

test("a note posted away from the feed goes to the feed that shows it and settles in there", async ({ page }) => {
  await page.goto("/ko/blog/explore");
  await postFromHeader(page, "블로그에서 쓴 노트");
  await expect(page).toHaveURL(/\?sort=for-you$/, { timeout: 30_000 });
  const row = page.locator("article[data-note-id]").first();
  await expect(row).toContainText("블로그에서 쓴 노트");
  expect((await motion(row)).names).toBe("note-arrive, note-wash");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(toastBy(page)).toHaveCount(0);
});

test("with reduced motion the note does not move, and only the wash fades", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ko/blog");
  await postFromHeader(page, "움직이지 않는 노트");
  const row = page.locator("article", { hasText: "움직이지 않는 노트" }).first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  expect(await motion(row)).toMatchObject({ names: "note-wash", durations: "1.2s" });
});

function toastBy(page: Page) {
  return page.getByTestId("toast").filter({ hasText: "노트를 올렸어요" });
}
