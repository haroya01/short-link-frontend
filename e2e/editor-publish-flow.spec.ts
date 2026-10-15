import { expect, test, type Page } from "@playwright/test";
import { expectOnTop, toastBy } from "./helpers/on-top";

// mock-on 레인: 작성 목의 7001 은 발행된 글, 7002 는 임시저장, 7003 은 예약된 글이다.
const DRAFT = "/ko/blog/write/7002";
const PUBLISHED = "/ko/blog/write/7001";
const SCHEDULED = "/ko/blog/write/7003";
const SCHEDULED_TIME = /\d+월 \d+일 (오전|오후) \d{2}:\d{2}/;

async function openEditor(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator(".tiptap")).toBeVisible({ timeout: 30_000 });
}
const settings = (page: Page) => page.getByRole("dialog", { name: /발행 설정|글 설정/ });
const footerButtons = (page: Page) => settings(page).locator("footer button");

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("머리의 미리보기는 저장한 임시저장 글을 새 탭에서 미리보기 주소로 연다", async ({ page }) => {
    await openEditor(page, DRAFT);
    const popup = page.waitForEvent("popup");
    await page.getByRole("button", { name: "미리보기", exact: true }).click();
    const tab = await popup;
    await expect.poll(() => tab.url()).toMatch(/\/mock-draft\?preview=mock-preview-7002$/);
  });

  test("발행 창은 지금·예약을 바로 고르게 하고, 미리보기가 앞, 링크 복사는 그 뒤다", async ({ page }) => {
    await openEditor(page, DRAFT);
    await page.getByRole("button", { name: "발행", exact: true }).click();
    await expect(settings(page).getByText("이렇게 보여요", { exact: true })).toBeVisible();
    await expect(settings(page).getByRole("button", { name: /추가 설정/ })).toHaveAttribute("aria-expanded", "false");
    await settings(page).getByRole("radio", { name: "예약" }).click();
    await expect(settings(page).locator('input[type="datetime-local"]')).toBeVisible();
    await expect(footerButtons(page)).toHaveText(["미리보기", "미리보기 링크 복사", "예약하기"]);
  });

  test("예약된 글은 목록과 같은 꼴로 시각을 보이고, 시각을 바꾸면 그 시각으로 다시 예약한다", async ({ page }) => {
    await page.goto("/ko/blog/write");
    const listed = page.getByText(/발행 예정$/).first();
    await expect(listed).toBeVisible({ timeout: 30_000 });
    const listedTime = (await listed.textContent())!.match(SCHEDULED_TIME)![0];

    await openEditor(page, SCHEDULED);
    await page.getByRole("button", { name: "글 설정" }).click();
    await expect(settings(page).locator("footer")).toContainText(`${listedTime} 발행 예정`);
    await expect(footerButtons(page)).toHaveText(["미리보기", "미리보기 링크 복사", "예약 취소", "시각 바꾸기", "지금 발행"]);
    const change = settings(page).getByRole("button", { name: "시각 바꾸기" });
    await expect(change).toBeDisabled();

    const time = settings(page).locator('input[type="datetime-local"]');
    const next = new Date(Date.now() + 3 * 86_400_000);
    next.setHours(9, 30, 0, 0);
    const local = new Date(next.getTime() - next.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    await time.fill(local);
    await change.click();
    await expectOnTop(toastBy(page, /에 발행 예약됐어요\.$/));
    await expect(toastBy(page, /에 발행 예약됐어요\.$/)).toHaveText(new RegExp(`^${SCHEDULED_TIME.source}에 발행 예약됐어요\\.$`));
  });

  test("예약된 글을 지금 발행하면 그 글로 간다", async ({ page }) => {
    await openEditor(page, SCHEDULED);
    await page.getByRole("button", { name: "글 설정" }).click();
    await settings(page).getByRole("button", { name: "지금 발행" }).click();
    await page.waitForURL(/\/mock-scheduled$/);
  });

  test("발행된 글의 글 설정은 발행 취소와 변경사항 저장 둘뿐이다", async ({ page }) => {
    await openEditor(page, PUBLISHED);
    await page.getByRole("button", { name: "글 설정" }).click();
    await expect(footerButtons(page)).toHaveText(["발행 취소", "변경사항 저장"]);
  });

  test("저장이 실패하면 머리가 '저장 못 함 · 다시 시도'가 되고, 누르면 바로 다시 저장한다", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("kurl:mock-fail:post-save", "1"));
    await openEditor(page, DRAFT);
    await page.locator(".tiptap").click();
    await page.keyboard.press("End");
    await page.keyboard.type(" 이어 씀");
    const retry = page.getByRole("button", { name: "저장 못 함 · 다시 시도" });
    await expect(retry).toBeVisible({ timeout: 15_000 });

    await page.evaluate(() => window.localStorage.removeItem("kurl:mock-fail:post-save"));
    await retry.click();
    await expect(retry).toHaveCount(0);
    await expect(page.getByText(/저장됨$/)).toBeVisible();
  });

  test("데스크톱 본문 안내는 짧다", async ({ page }) => {
    await openEditor(page, "/ko/blog/write/new");
    await expect(page.locator(".tiptap p[data-placeholder]").first()).toHaveAttribute("data-placeholder", "'/'로 블록 넣기");
  });

  test("첫 발행 축하는 화면 낭독기에 '발행했어요'를 알린다", async ({ page }) => {
    await page.goto("/ko/blog/write");
    await page.evaluate(() => sessionStorage.setItem("kurl:celebrate-publish", "nextjs-14-app-router-blog"));
    await page.goto("/ko/p/dohyun/nextjs-14-app-router-blog", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("status").filter({ hasText: "발행했어요" })).toBeAttached({ timeout: 30_000 });
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("도구 막대는 굵게·링크 다음이 이미지이고, 넘치는 쪽 가장자리가 흐려지며, 본문 안내는 '내용'이다", async ({ page }) => {
    await openEditor(page, "/ko/blog/write/new");
    const toolbar = page.getByTestId("editor-toolbar");
    const labels = await toolbar.locator("button").evaluateAll((els) => els.slice(0, 3).map((el) => el.getAttribute("aria-label")));
    expect(labels).toEqual(["굵게", "링크", "이미지"]);
    await expect(toolbar).toHaveAttribute("data-edge-end", "true");
    await expect(toolbar).not.toHaveAttribute("data-edge-start", "true");

    await toolbar.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
    await expect(toolbar).toHaveAttribute("data-edge-start", "true");
    await expect(toolbar).not.toHaveAttribute("data-edge-end", "true");
    await expect(page.locator(".tiptap p[data-placeholder]").first()).toHaveAttribute("data-placeholder", "내용");
  });
});
