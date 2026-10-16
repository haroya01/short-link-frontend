import { test, expect, type Page } from "@playwright/test";
import { expectOnTop, toastBy } from "./helpers/on-top";

// Mock state lives only for the SPA session, so the draft is opened from the list by soft navigation.
test.use({ viewport: { width: 1280, height: 900 } });

const DRAFT = "작성 중인 초안";
const THEIRS = "다른 기기에서 고친 제목";
const MINE = "이 기기에서 고친 제목";

async function openDraft(page: Page) {
  await page.goto("/ko/blog/write");
  await page.getByRole("listitem").getByRole("link", { name: new RegExp(DRAFT) }).click({ timeout: 30_000 });
  await expect(page.getByRole("textbox", { name: "제목" })).toHaveValue(DRAFT, { timeout: 30_000 });
}

async function editElsewhere(page: Page) {
  await page.evaluate((title) => {
    const mock = (window as unknown as { __kurlMockAuthoring: { editElsewhere: (id: number, e: object) => void } })
      .__kurlMockAuthoring;
    const id = Number(window.location.pathname.split("/").pop());
    mock.editElsewhere(id, { title, body: "다른 기기에서 쓴 본문" });
  }, THEIRS);
}

async function meetConflict(page: Page) {
  await openDraft(page);
  await editElsewhere(page);
  await page.getByRole("textbox", { name: "제목" }).fill(MINE);
  const ask = page.getByRole("alertdialog", { name: "다른 기기에서 이 글을 고쳤어요" });
  await expect(ask).toBeVisible({ timeout: 10_000 });
  return ask;
}

async function loadLatest(page: Page) {
  const ask = await meetConflict(page);
  await page.keyboard.press("Escape");
  await expect(ask).toBeVisible();
  await ask.getByRole("button", { name: "최신으로 불러오기" }).click();
  await expect(ask).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "제목" })).toHaveValue(THEIRS, { timeout: 10_000 });
  const kept = page.getByTestId("editor-kept");
  await expect(kept).toContainText("이 기기에 보관해 두었어요");
  return kept;
}

test("loading the latest keeps mine, which can be brought back over it and saved on the latest", async ({ page }) => {
  const kept = await loadLatest(page);
  await kept.getByRole("button", { name: "내 내용 되살리기" }).click();
  await expect(page.getByRole("textbox", { name: "제목" })).toHaveValue(MINE);
  await expect(kept).toHaveCount(0);

  await page.getByRole("link", { name: "글 목록" }).click();
  await expect(page.getByRole("listitem").getByRole("link", { name: new RegExp(MINE) })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});

test("the kept version can be thrown away instead", async ({ page }) => {
  const kept = await loadLatest(page);
  await kept.getByRole("button", { name: "삭제" }).click();
  await expect(kept).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "제목" })).toHaveValue(THEIRS);
});

test("keeping mine saves over the other device's version, which revisions can bring back", async ({ page }) => {
  const ask = await meetConflict(page);
  await ask.getByRole("button", { name: "내 내용으로 덮기" }).click();
  await expectOnTop(toastBy(page, "내 내용으로 덮었어요. 덮인 내용은 버전 기록에서 되돌릴 수 있어요."));
  await expect(ask).toHaveCount(0);

  await page.getByRole("link", { name: "글 목록" }).click();
  await expect(page.getByRole("listitem").getByRole("link", { name: new RegExp(MINE) })).toBeVisible({ timeout: 30_000 });
});

test("coming back to the tab with nothing unsaved shows another device's save", async ({ page }) => {
  await openDraft(page);
  await editElsewhere(page);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByRole("textbox", { name: "제목" })).toHaveValue(THEIRS, { timeout: 10_000 });
  await expectOnTop(toastBy(page, "다른 기기에서 고친 최신 내용을 불러왔어요."));
});
