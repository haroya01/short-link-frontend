import { expect, test, type Page } from "@playwright/test";
import { expectOnTop, toastBy } from "./helpers/on-top";

// mock-on 레인: 목 세션은 @dohyun. 노트 34는 haruka의 30에 yuna가 단 답글이고 그 아래엔 답글이 없다.
// 노트 70은 yuna가 멘션한 사람만 답글을 받게 막아 둔 스레드다.
test.use({ viewport: { width: 1280, height: 900 } });

const replyButton = (page: Page, id: number) => page.locator(`[data-note-reply="${id}"]`).first();
const sheet = (page: Page) => page.getByTestId("note-reply-dialog");

async function post(page: Page, text: string) {
  const field = sheet(page).getByRole("textbox", { name: "답글 쓰기" });
  await expect(field).toBeFocused();
  await field.fill(text);
  await sheet(page).getByRole("button", { name: "올리기", exact: true }).click();
  const notice = page.getByRole("dialog").filter({ hasText: "노트는 다른 서버에도 전해져요" });
  await expect.poll(async () => (await notice.isVisible()) || (await sheet(page).count()) === 0).toBe(true);
  if (await notice.isVisible()) await notice.getByRole("button", { name: "알겠어요, 올릴게요" }).click();
}

test("the reply icon in the feed opens a sheet for that note, and the posted reply counts and can be opened", async ({ page }) => {
  await page.goto("/ko/blog");
  const seed = page.locator('article[data-note-id="3"]').first();
  await expect(seed).toBeVisible({ timeout: 30_000 });
  await expect(replyButton(page, 3)).toHaveAccessibleName("답글 쓰기 1");
  await replyButton(page, 3).click();
  await expect(page).toHaveURL(/\/blog$/);

  await expect(sheet(page).getByRole("heading", { name: "답글" })).toBeVisible();
  await expect(sheet(page).getByTestId("note-reply-target")).toContainText("오늘 쓴 글의 씨앗");
  await expect(sheet(page).getByRole("button", { name: "예약", exact: true })).toHaveCount(0);
  await expect(sheet(page).getByRole("button", { name: "스레드에 추가" })).toHaveCount(0);

  await post(page, "씨앗에서 싹이 나길");
  const toast = toastBy(page, "답글을 올렸어요");
  await expectOnTop(toast);
  await expect(sheet(page)).toHaveCount(0);
  await expect(replyButton(page, 3)).toHaveAccessibleName("답글 쓰기 2");
  await toast.getByRole("button", { name: "보기" }).click();
  await expect(page).toHaveURL(/\/dohyun\/notes\/\d+$/);
});

test("the last reply in a thread offers a composer, not an empty line, and a new reply lands on top", async ({ page }) => {
  await page.goto("/ko/p/yuna/notes/34");
  const focused = page.locator('article[data-note-id="34"]');
  await expect(focused).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("아직 답글이 없어요")).toHaveCount(0);
  await expect(page.locator("#note-replies")).toHaveCount(0);
  await expect(page.getByTestId("note-reply-prompt")).toHaveText("@yuna님에게 답글 남기기");

  await replyButton(page, 34).click();
  await expect(sheet(page).getByTestId("note-reply-target")).toContainText("셋째가 제일 공감돼요.");
  await post(page, "저도 셋째요");
  await expect(sheet(page)).toHaveCount(0);
  await expect(page.locator("#note-replies")).toHaveText("답글 1");
  const landed = page.locator("section article[data-note-id]").first();
  await expect(landed).toContainText("저도 셋째요");
  await expect(landed).toBeInViewport();

  await page.getByTestId("note-reply-prompt").click();
  await post(page, "하나 더");
  await expect(page.locator("#note-replies")).toHaveText("답글 2");
  await expect(page.locator("section article[data-note-id]").first()).toContainText("하나 더");
});

test("a thread closed to the reader closes its reply icons too, before anything is written", async ({ page }) => {
  await page.goto("/ko/p/yuna/notes/70");
  await expect(page.getByTestId("reply-restricted")).toBeVisible({ timeout: 30_000 });
  await expect(replyButton(page, 70)).toBeDisabled();
  await expect(replyButton(page, 70)).toHaveAttribute("title", "작성자가 멘션한 사람만 답글을 달 수 있어요");
  await expect(page.getByTestId("note-reply-prompt")).toHaveCount(0);
});
