import { test, expect, type Page } from "@playwright/test";

/**
 * The post editor in MOCK-ON. The in-memory authoring mock seeds a draft, a published post and a
 * scheduled post and keeps edits for the SPA session (a reload resets it), so each test opens its
 * post from the list with a soft navigation, as an author does.
 */
test.use({ viewport: { width: 1280, height: 900 } });

const DRAFT = "작성 중인 초안";
const PUBLISHED = "로컬에서 쓴 발행 글";
const SCHEDULED = "예약해둔 다음 글";

function listRow(page: Page, title: string) {
  return page.getByRole("listitem").getByRole("link", { name: new RegExp(title) });
}

async function openFromList(page: Page, title: string) {
  await page.goto("/ko/blog/write");
  await listRow(page, title).click({ timeout: 30_000 });
  await expect(page.getByRole("textbox", { name: "제목" })).toHaveValue(title, { timeout: 30_000 });
}

test("Back from a draft keeps the title typed just before it", async ({ page }) => {
  await openFromList(page, DRAFT);
  await page.getByRole("textbox", { name: "제목" }).fill("뒤로 가기 직전에 고친 제목");
  await page.goBack();
  await expect(page).toHaveURL(/\/blog\/write$/, { timeout: 30_000 });
  await expect(listRow(page, "뒤로 가기 직전에 고친 제목")).toBeVisible({ timeout: 30_000 });
});

test("Back walks past the editor in one press after leaving it by its own back button", async ({ page }) => {
  await openFromList(page, DRAFT);
  await page.getByRole("textbox", { name: "제목" }).fill("목록 버튼으로 나간 초안");
  await page.getByRole("link", { name: "글 목록" }).click();
  await expect(listRow(page, "목록 버튼으로 나간 초안")).toBeVisible({ timeout: 30_000 });

  await page.goBack();
  await expect(page.getByRole("textbox", { name: "제목" })).toHaveValue("목록 버튼으로 나간 초안", { timeout: 30_000 });
  await page.goBack();
  await expect(page).toHaveURL(/\/blog\/write$/, { timeout: 30_000 });
  await expect(listRow(page, "목록 버튼으로 나간 초안")).toBeVisible({ timeout: 30_000 });
});

test("Back from a published post with unsaved edits asks first, and stays when declined", async ({ page }) => {
  await openFromList(page, PUBLISHED);
  const title = page.getByRole("textbox", { name: "제목" });
  await title.fill("저장 안 한 발행 글 제목");

  await page.goBack();
  const ask = page.getByRole("dialog", { name: "저장하지 않은 변경이 있어요" });
  await ask.getByRole("button", { name: "취소" }).click();
  await expect(ask).toHaveCount(0);
  await expect(page).toHaveURL(/\/blog\/write\/\d+$/);
  await expect(title).toHaveValue("저장 안 한 발행 글 제목");

  await page.goBack();
  await ask.getByRole("button", { name: "나가기" }).click();
  await expect(page).toHaveURL(/\/blog\/write$/, { timeout: 30_000 });
  await expect(listRow(page, PUBLISHED)).toBeVisible();
});

test("a slug typed in Korean is flagged at the field and doesn't stop the title from saving", async ({ page }) => {
  await openFromList(page, DRAFT);
  await page.getByRole("button", { name: "발행", exact: true }).click();
  const publish = page.getByRole("dialog");
  await publish.getByRole("button", { name: "추가 설정" }).click();
  const slug = publish.getByRole("textbox", { name: "글 주소(slug)" });
  await slug.fill("한글주소");
  await expect(slug).toHaveValue("");
  await expect(slug).toHaveAttribute("aria-invalid", "true");
  await expect(publish.getByText("주소는 영문 소문자·숫자·하이픈으로 2자 이상 써 주세요.")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("textbox", { name: "제목" }).fill("주소 없이 저장된 제목");
  await expect(page.getByText("저장됨")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("저장하지 못했어요", { exact: false })).toHaveCount(0);
  await page.goBack();
  await expect(listRow(page, "주소 없이 저장된 제목")).toBeVisible({ timeout: 30_000 });
});

test("a HEIC photo is refused by name before it reaches the post", async ({ page }) => {
  await openFromList(page, DRAFT);
  const picker = page.locator('main input[type="file"]');
  await expect(picker).toHaveAttribute("accept", "image/jpeg,image/png,image/webp,image/gif");
  await picker.setInputFiles({ name: "IMG_0001.HEIC", mimeType: "image/heic", buffer: Buffer.from([0, 1, 2, 3]) });
  await expect(page.getByText("HEIC 이미지는 올릴 수 없어요. JPG·PNG·WebP·GIF로 바꿔서 올려 주세요.")).toBeVisible();
  await expect(page.locator(".tiptap img")).toHaveCount(0);
});

test("a scheduled post can't be saved without a title", async ({ page }) => {
  await openFromList(page, SCHEDULED);
  await page.getByRole("textbox", { name: "제목" }).fill("");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("예약한 글은 제목을 비울 수 없어요", { exact: false })).toBeVisible();

  await page.goBack();
  await page.getByRole("dialog", { name: "저장하지 않은 변경이 있어요" }).getByRole("button", { name: "나가기" }).click();
  await expect(listRow(page, SCHEDULED)).toBeVisible({ timeout: 30_000 });
});
