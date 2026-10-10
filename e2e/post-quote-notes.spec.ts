import { expect, test } from "@playwright/test";

// Mock lane: one note quotes "design-tokens-to-tailwind"; nothing quotes the Next.js post.
test.use({ viewport: { width: 1280, height: 900 } });

test("a post quoted in notes shows a notes tab beside its comments, with those notes", async ({ page }) => {
  await page.goto("/ko/p/sora/design-tokens-to-tailwind");
  const notesTab = page.getByTestId("discussion-tab-notes");
  await expect(notesTab).toHaveText("노트 1", { timeout: 30_000 });
  await expect(page.getByTestId("discussion-tab-comments")).toHaveAttribute("aria-selected", "true");

  await notesTab.click();
  await expect(notesTab).toHaveAttribute("aria-selected", "true");
  const panel = page.getByTestId("post-quote-notes");
  await expect(panel).toContainText("블로그 글을 인용해 봤어요.");
  await expect(panel.getByRole("button", { name: "노트로 인용" })).toBeVisible();
  await expect(page.getByTestId("comment-composer-placeholder")).toHaveCount(0);

  await page.getByTestId("discussion-tab-comments").click();
  await expect(page.getByTestId("comment-composer-placeholder")).toBeVisible();
});

test("a post nobody quoted keeps the plain comments heading", async ({ page }) => {
  await page.goto("/ko/p/dohyun/nextjs-14-app-router-blog");
  await expect(page.getByTestId("comment-composer-placeholder")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("discussion-tab-notes")).toHaveCount(0);
});

async function postQuote(page: import("@playwright/test").Page, body: string) {
  const dialog = page.getByRole("dialog", { name: "노트로 인용" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "생각을 덧붙여 보세요" }).fill(body);
  await dialog.getByRole("button", { name: "올리기" }).click();
  await page.getByRole("dialog").filter({ hasText: "노트는 다른 서버에도 전해져요" })
    .getByRole("button", { name: "알겠어요, 올릴게요" }).click();
  await expect(dialog).toHaveCount(0);
}

test("quoting from the notes tab puts the new note there and counts it", async ({ page }) => {
  await page.goto("/ko/p/sora/design-tokens-to-tailwind");
  const notesTab = page.getByTestId("discussion-tab-notes");
  await expect(notesTab).toHaveText("노트 1", { timeout: 30_000 });
  await notesTab.click();
  const panel = page.getByTestId("post-quote-notes");
  await panel.getByRole("button", { name: "노트로 인용" }).click();
  await postQuote(page, "토큰 이름부터 정하자");

  await expect(notesTab).toHaveText("노트 2");
  await expect(panel).toContainText("토큰 이름부터 정하자");
  await expect(panel).toContainText("블로그 글을 인용해 봤어요.");
});

test("the first quote of a post raises the notes tab right away", async ({ page }) => {
  await page.goto("/ko/p/dohyun/nextjs-14-app-router-blog");
  await expect(page.getByTestId("comment-composer-placeholder")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("discussion-tab-notes")).toHaveCount(0);
  await page.locator("article header").getByRole("button", { name: "글 메뉴", exact: true }).click();
  await page.getByRole("menuitem", { name: "노트로 인용" }).click();
  await postQuote(page, "앱 라우터로 옮긴 순서가 궁금하다");

  const notesTab = page.getByTestId("discussion-tab-notes");
  await expect(notesTab).toHaveText("노트 1");
  await notesTab.click();
  await expect(page.getByTestId("post-quote-notes")).toContainText("앱 라우터로 옮긴 순서가 궁금하다");
});
