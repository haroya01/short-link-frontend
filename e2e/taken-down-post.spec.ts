import { test, expect, type Page } from "@playwright/test";

// Mock state lives only for the SPA session, so posts are opened from the list by soft navigation.
test.use({ viewport: { width: 1280, height: 900 } });

const TAKEN_DOWN = "신고로 내려진 글";
const PUBLISHED = "로컬에서 쓴 발행 글";

async function openFromList(page: Page, title: string) {
  await page.goto("/ko/blog/write");
  await page.getByRole("listitem").getByRole("link", { name: new RegExp(title) }).click({ timeout: 30_000 });
  await expect(page.getByRole("textbox", { name: "제목" })).toHaveValue(title, { timeout: 30_000 });
}

test("the write list says a post was taken down under the content policy", async ({ page }) => {
  await page.goto("/ko/blog/write");
  const row = page.getByRole("listitem").filter({ hasText: TAKEN_DOWN });
  await expect(row).toBeVisible({ timeout: 30_000 });
  await expect(row.getByText("내려짐", { exact: true })).toBeVisible();
  await expect(row.getByText("운영 정책으로 내려진 글이에요")).toBeVisible();
});

test("a taken-down post can be edited and saved but not republished", async ({ page }) => {
  await openFromList(page, TAKEN_DOWN);
  const notice = page.getByTestId("taken-down-notice");
  await expect(notice).toContainText("운영 정책으로 내려진 글이에요");
  await expect(notice).toContainText("고쳐서 저장할 수는 있지만 다시 공개할 수는 없어요.");

  await page.getByRole("button", { name: "글 설정" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByTestId("taken-down-notice")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "재발행" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "미리보기 링크 복사" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.getByRole("textbox", { name: "제목" }).fill("고친 제목");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("저장됨", { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  await expect(notice).toBeVisible();
});

test("a suspended writer is told why a public post's edit was refused", async ({ page }) => {
  await openFromList(page, PUBLISHED);
  await page.evaluate(() => {
    (window as unknown as { __kurlMockAuthoring: { moderate: (code: string | null) => void } })
      .__kurlMockAuthoring.moderate("ACCOUNT_SUSPENDED");
  });
  await page.getByRole("textbox", { name: "제목" }).fill("정지 중에 고친 제목");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(
    page.getByText("계정이 일시 정지된 동안에는 글을 공개하거나 공개된 글을 고칠 수 없어요. 초안은 계속 쓸 수 있어요."),
  ).toBeVisible({ timeout: 10_000 });
});
