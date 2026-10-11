import { expect, test, type Page } from "@playwright/test";

// mock-on 레인: 작성 목의 7001 은 발행된 글이라 편집이 자동 저장되지 않고 남는다. 7002 는 임시저장 글.
const PUBLISHED = "/ko/blog/write/7001";
const DRAFT = "/ko/blog/write/7002";

test.use({ viewport: { width: 1280, height: 900 } });

async function openEditor(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator(".tiptap")).toBeVisible({ timeout: 30_000 });
}

async function editPublished(page: Page) {
  await openEditor(page, PUBLISHED);
  await page.locator(".tiptap").click();
  await page.keyboard.press("End");
  await page.keyboard.type(" 덧붙임");
}

async function expectLeavePrompt(page: Page, leave: () => Promise<void>) {
  const asked: string[] = [];
  page.once("dialog", (dialog) => {
    asked.push(dialog.type());
    void dialog.dismiss();
  });
  await leave();
  await expect.poll(() => asked, { timeout: 10_000 }).toEqual(["beforeunload"]);
  await expect(page).toHaveURL(new RegExp(`${PUBLISHED}$`));
  await expect(page.locator(".tiptap")).toContainText("덧붙임");
}

test.describe("저장 안 한 편집이 있을 때 머리의 이동은 나가기 전에 묻는다", () => {
  test("검색", async ({ page }) => {
    await editPublished(page);
    await page.locator("header").getByRole("button", { name: "검색", exact: true }).click();
    const box = page.locator("header").getByRole("searchbox", { name: "검색" });
    await box.fill("일상");
    await expectLeavePrompt(page, () => box.press("Enter"));
  });

  test("알림의 모든 알림 보기", async ({ page }) => {
    await editPublished(page);
    await page.locator("header").getByRole("button", { name: /^알림/ }).click();
    await expectLeavePrompt(page, () => page.getByRole("link", { name: "모든 알림 보기" }).click());
  });

  test("언어 바꾸기", async ({ page }) => {
    await editPublished(page);
    await page.getByRole("button", { name: "계정", exact: true }).click();
    await page.getByRole("button", { name: /^언어/ }).click();
    await expectLeavePrompt(page, () => page.getByRole("menuitem", { name: "English" }).click());
  });
});

test("발행 창에서 새 시리즈 이름 칸의 Esc 는 그 칸만 닫고, 포커스를 새 시리즈 버튼에 돌려준다", async ({ page }) => {
  await openEditor(page, DRAFT);
  await page.getByRole("button", { name: "발행", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: /발행 설정/ });
  await dialog.locator("button[aria-expanded]").click();
  await dialog.getByRole("button", { name: "새 시리즈", exact: true }).click();
  const name = dialog.getByRole("textbox", { name: "새 시리즈" });
  await expect(name).toBeFocused();

  await name.press("Escape");
  await expect(name).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "새 시리즈", exact: true })).toBeFocused();
});

test("다크 모드의 본문 안내는 본문 글자보다 한참 옅다", async ({ page, context }) => {
  await context.addCookies([{ name: "theme", value: "dark", domain: "localhost", path: "/" }]);
  await openEditor(page, "/ko/blog/write/new");
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  const placeholder = page.locator(".tiptap p.is-editor-empty").first();
  await expect
    .poll(() => placeholder.evaluate((el) => getComputedStyle(el, "::before").color))
    .toBe("rgb(79, 86, 82)");
});

test("저장이 실패한 채로 연결이 끊겼다 돌아오면, 누르지 않아도 다시 저장한다", async ({ page, context }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:mock-fail:post-save", "1"));
  await editPublished(page);
  await page.getByRole("button", { name: "저장", exact: true }).click();
  const retry = page.getByRole("button", { name: "저장 못 함 · 다시 시도" });
  await expect(retry).toBeVisible();

  await page.evaluate(() => window.localStorage.removeItem("kurl:mock-fail:post-save"));
  await context.setOffline(true);
  await context.setOffline(false);
  await expect(retry).toHaveCount(0);
  await expect(page.getByRole("button", { name: "저장", exact: true })).toBeVisible();
});
