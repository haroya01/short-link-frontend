import { test, expect, type Page } from "@playwright/test";

// mock-on 레인: 글의 문장을 골라 "공개 메모"를 열면 댓글 입력기(RichCommentInput)가 뜬다. 링크 넣기는
// 긴 글 편집기와 같은 모델이되 카드는 없다(댓글은 [글자](주소) 링크만 그린다).
const POST = "/ko/p/dohyun/nextjs-14-app-router-blog";
const sheet = (page: Page) => page.getByRole("dialog", { name: "메모 추가" });
const field = (page: Page) => sheet(page).locator(".tiptap-comment");

async function openNote(page: Page) {
  await page.goto(POST);
  await expect(page.locator(".prose-post")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("comment-composer-placeholder")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const block = Array.from(document.querySelector(".prose-post")!.children).find(
      (el) => (el.textContent || "").trim().length > 20,
    ) as HTMLElement;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    while (walker.nextNode() && (walker.currentNode.textContent || "").trim().length < 12);
    const node = walker.currentNode as Text;
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, Math.min(8, node.data.length));
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
  await page.getByRole("toolbar").getByRole("button", { name: "공개 메모", exact: true }).click();
  await expect(field(page)).toBeVisible();
  await field(page).click();
}

async function selectBack(page: Page, chars: number, expected: string) {
  for (let i = 0; i < chars; i++) await page.keyboard.press("Shift+ArrowLeft");
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe(expected);
}

async function paste(page: Page, text: string) {
  await field(page).evaluate((node, text) => {
    const data = new DataTransfer();
    data.setData("text/plain", text);
    node.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
  }, text);
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("주소를 고른 글자 위에 붙이면 그 글자가 링크가 되고, 한 번 되돌리면 풀린다", async ({ page }) => {
    await openNote(page);
    await page.keyboard.type("공식 문서 참고");
    await selectBack(page, 2, "참고");
    await paste(page, "https://kurl.me/guide");
    await expect(field(page).getByRole("link", { name: "참고", exact: true })).toHaveAttribute("href", "https://kurl.me/guide");
    await page.keyboard.press("ControlOrMeta+z");
    await expect(field(page).getByRole("link")).toHaveCount(0);
    await expect(field(page)).toHaveText("공식 문서 참고");
  });

  test("빈 줄이나 문장 중간에 붙인 주소는 고르기 없이 그냥 링크다", async ({ page }) => {
    await openNote(page);
    await paste(page, "https://kurl.me/about");
    await expect(field(page).getByRole("link", { name: "https://kurl.me/about" })).toBeVisible();
    await expect(sheet(page).locator("[data-link-choice]")).toHaveCount(0);
    await page.keyboard.type(" 그리고 ");
    await paste(page, "https://kurl.me/docs");
    await expect(field(page).getByRole("link", { name: "https://kurl.me/docs" })).toBeVisible();
    await page.keyboard.type(" 끝");
    await expect(field(page).getByRole("link", { name: "https://kurl.me/docs" })).toHaveText("https://kurl.me/docs");
  });

  test("링크 버튼은 카드 없는 링크 시트를 열고, 넣은 링크는 카드에선 글자로, 대화에선 링크로 보인다", async ({ page }) => {
    await openNote(page);
    await page.keyboard.type("자세히");
    await selectBack(page, 3, "자세히");
    await sheet(page).getByRole("button", { name: "링크", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "링크 넣기" });
    await expect(dialog.getByRole("radiogroup")).toHaveCount(0);
    await expect(dialog.getByLabel("표시 텍스트", { exact: true })).toHaveValue("자세히");
    await dialog.getByLabel("주소", { exact: true }).fill("example.com/docs");
    await dialog.getByRole("button", { name: "넣기" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(field(page).getByRole("link", { name: "자세히" })).toHaveAttribute("href", "https://example.com/docs");

    await sheet(page).getByRole("button", { name: "저장", exact: true }).click();
    await expect(sheet(page)).toHaveCount(0);
    await page.locator("mark.kurl-highlight--thread").first().click();
    const card = page.getByTestId("highlight-card");
    await expect(card).toContainText("자세히", { timeout: 10_000 });
    await expect(card).not.toContainText("](");
    await card.locator("[data-testid^=highlight-card-conversation-]").first().click();
    const thread = page.getByRole("dialog").filter({ has: page.locator("#hl-thread-quote") });
    await expect(thread.getByRole("link", { name: "자세히" })).toHaveAttribute("href", "https://example.com/docs");
  });

  test("링크를 누르면 열기 · 고치기 · 링크 빼기가 뜬다", async ({ page }) => {
    await openNote(page);
    await page.keyboard.type("여기 ");
    await paste(page, "https://kurl.me/docs");
    await field(page).getByRole("link", { name: "https://kurl.me/docs" }).click();
    const actions = page.getByRole("group", { name: "링크" });
    await expect(actions.getByRole("button")).toHaveText(["열기", "고치기", "링크 빼기"]);

    await actions.getByRole("button", { name: "고치기" }).click();
    const dialog = page.getByRole("dialog", { name: "링크 고치기" });
    await expect(dialog.getByLabel("주소", { exact: true })).toHaveValue("https://kurl.me/docs");
    await dialog.getByRole("button", { name: "취소" }).click();

    await field(page).getByRole("link", { name: "https://kurl.me/docs" }).click();
    await page.getByRole("group", { name: "링크" }).getByRole("button", { name: "링크 빼기" }).click();
    await expect(field(page).getByRole("link")).toHaveCount(0);
    await expect(field(page)).toContainText("https://kurl.me/docs");
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("휴대폰에선 링크 시트가 메모 시트 위로 올라온다", async ({ page }) => {
    await openNote(page);
    await sheet(page).getByRole("button", { name: "링크", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "링크 넣기" });
    await expect(dialog.getByLabel("주소", { exact: true })).toBeVisible();
    await dialog.getByLabel("주소", { exact: true }).fill("https://kurl.me/a");
    await dialog.getByRole("button", { name: "넣기" }).click();
    await expect(field(page).getByRole("link", { name: "https://kurl.me/a" })).toBeVisible();
  });
});
