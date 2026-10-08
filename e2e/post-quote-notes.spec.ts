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
