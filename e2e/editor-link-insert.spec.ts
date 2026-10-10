import { test, expect, type Page } from "@playwright/test";

const DRAFT = "작성 중인 초안";
const body = (page: Page) => page.locator(".tiptap");

async function openDraft(page: Page) {
  await page.goto("/ko/blog/write");
  await page.getByRole("listitem").getByRole("link", { name: new RegExp(DRAFT) }).click({ timeout: 30_000 });
  await expect(body(page)).toBeVisible({ timeout: 30_000 });
  const last = (await body(page).locator("> *").last().boundingBox())!;
  await page.mouse.click(last.x + last.width - 2, last.y + last.height / 2);
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  await page.keyboard.press("Enter");
}

async function selectBack(page: Page, chars: number, expected: string) {
  for (let i = 0; i < chars; i++) await page.keyboard.press("Shift+ArrowLeft");
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe(expected);
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
}

async function paste(page: Page, text: string) {
  await body(page).evaluate((node, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    node.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
  }, text);
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("a URL pasted over selected text links it, and one undo takes it back", async ({ page }) => {
    await openDraft(page);
    await page.keyboard.type("read the guide");
    await selectBack(page, 5, "guide");
    await paste(page, "https://kurl.me/guide");
    await expect(body(page).getByRole("link", { name: "guide", exact: true })).toHaveAttribute("href", "https://kurl.me/guide");
    await expect(body(page).locator("[data-link-choice]")).toHaveCount(0);
    await page.keyboard.press("ControlOrMeta+z");
    await expect(body(page).getByRole("link", { name: "guide", exact: true })).toHaveCount(0);
    await expect(body(page)).toContainText("read the guide");
  });

  test("a bare URL on an empty line goes in as a link with a link · card choice, and card makes it a card", async ({ page }) => {
    await openDraft(page);
    await paste(page, "https://kurl.me/about");
    const link = body(page).getByRole("link", { name: "https://kurl.me/about" });
    await expect(link).toBeVisible();
    const choice = body(page).getByRole("group", { name: "링크 모양 고르기" });
    await expect(choice.getByRole("button")).toHaveText(["링크", "카드"]);
    await expect(choice.getByRole("button", { name: "링크" })).toHaveAttribute("aria-pressed", "true");
    await choice.getByRole("button", { name: "카드" }).click();
    await expect(body(page).locator('[data-link-card][data-url="https://kurl.me/about"]')).toBeVisible();
    await expect(link).toHaveCount(0);
    await expect(choice).toHaveCount(0);
  });

  test("typing on after the pasted URL dismisses the choice and keeps the link", async ({ page }) => {
    await openDraft(page);
    await paste(page, "https://youtu.be/dQw4w9WgXcQ");
    const choice = body(page).getByRole("group", { name: "링크 모양 고르기" });
    await expect(choice.getByRole("button")).toHaveText(["링크", "동영상"]);
    await page.keyboard.type(" 보세요");
    await expect(choice).toHaveCount(0);
    await expect(body(page).getByRole("link", { name: "https://youtu.be/dQw4w9WgXcQ" })).toBeVisible();
  });

  test("a URL pasted mid-sentence is just a link", async ({ page }) => {
    await openDraft(page);
    await page.keyboard.type("자세한 건 ");
    await paste(page, "https://kurl.me/docs");
    await expect(body(page).getByRole("link", { name: "https://kurl.me/docs" })).toBeVisible();
    await expect(body(page).locator("[data-link-choice]")).toHaveCount(0);
  });

  test("the toolbar link opens one dialog: text from the selection, address from the clipboard, and a kurl short link on request", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openDraft(page);
    await page.keyboard.type("공식 문서");
    await selectBack(page, 5, "공식 문서");
    await page.evaluate(() => navigator.clipboard.writeText("https://example.com/docs"));
    await page.getByTestId("editor-toolbar").getByRole("button", { name: "링크", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "링크 넣기" });
    await expect(dialog.getByLabel("표시 텍스트", { exact: true })).toHaveValue("공식 문서");
    await expect(dialog.getByLabel("주소", { exact: true })).toHaveValue("https://example.com/docs");
    await expect(dialog.getByText("클립보드에서 가져왔어요")).toBeVisible();
    await expect(dialog.getByRole("radiogroup")).toHaveCount(0);
    await dialog.getByRole("switch", { name: "kurl 단축 주소로" }).click();
    await dialog.getByRole("button", { name: "넣기" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(body(page).getByRole("link", { name: "공식 문서" })).toHaveAttribute("href", /^https:\/\/kurl\.me\/\w+$/);
  });

  test("the card side of the dialog previews the card before it goes in", async ({ page }) => {
    await openDraft(page);
    await page.getByTestId("editor-toolbar").getByRole("button", { name: "링크 카드·동영상" }).click();
    const dialog = page.getByRole("dialog", { name: "링크 넣기" });
    await expect(dialog.getByRole("radio", { name: "카드" })).toHaveAttribute("aria-checked", "true");
    await dialog.getByLabel("주소", { exact: true }).fill("example.com/post");
    await expect(dialog.locator("[data-link-preview]")).toContainText("example.com");
    await dialog.getByRole("button", { name: "넣기" }).click();
    await expect(body(page).locator('[data-link-card][data-url="https://example.com/post"]')).toBeVisible();
  });

  test("clicking a link offers open · edit · remove link", async ({ page }) => {
    await openDraft(page);
    await page.keyboard.type("자세한 건 ");
    await paste(page, "https://kurl.me/docs");
    await body(page).getByRole("link", { name: "https://kurl.me/docs" }).click();
    const actions = page.getByRole("group", { name: "링크" });
    await expect(actions.getByRole("button")).toHaveText(["열기", "고치기", "링크 빼기"]);
    await actions.getByRole("button", { name: "고치기" }).click();
    const dialog = page.getByRole("dialog", { name: "링크 고치기" });
    await expect(dialog.getByLabel("주소", { exact: true })).toHaveValue("https://kurl.me/docs");
    await dialog.getByLabel("표시 텍스트", { exact: true }).fill("문서");
    await dialog.getByRole("button", { name: "저장" }).click();
    const edited = body(page).getByRole("link", { name: "문서", exact: true });
    await expect(edited).toHaveAttribute("href", "https://kurl.me/docs");
    await edited.click();
    await page.getByRole("group", { name: "링크" }).getByRole("button", { name: "링크 빼기" }).click();
    await expect(body(page).getByRole("link", { name: "문서", exact: true })).toHaveCount(0);
    await expect(body(page)).toContainText("자세한 건 문서");
  });

  test("publishing leaves the links in the body as written", async ({ page }) => {
    await openDraft(page);
    await page.keyboard.type("자세한 건 ");
    await paste(page, "https://example.com/keep");
    await page.getByRole("button", { name: "발행", exact: true }).click();
    const publish = page.getByRole("dialog");
    await expect(publish).toBeVisible();
    await expect(publish).not.toContainText("단축");
    await publish.getByRole("button", { name: "추가 설정" }).click();
    await expect(publish).not.toContainText("본문 링크");
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("the toolbar link opens the same dialog as a bottom sheet", async ({ page }) => {
    await openDraft(page);
    await page.getByTestId("editor-toolbar").getByRole("button", { name: "링크", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "링크 넣기" });
    await expect(sheet.getByRole("radio")).toHaveText(["링크", "카드"]);
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
    const box = (await sheet.getByRole("button", { name: "넣기" }).boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    expect(box.y).toBeGreaterThan(400);
  });
});
