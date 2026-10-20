import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

const LONG = "/ko/p/kazuki/weekend-hiking-burnout";
const tops = (page: Page) => page.locator("#comments li[data-comment-top]");

test("a long thread shows five top-level comments, then opens the rest in place", async ({ page }) => {
  await page.goto(LONG);
  await expect(tops(page)).toHaveCount(5, { timeout: 30_000 });
  const more = page.getByTestId("comments-show-all");
  await expect(more).toHaveText(/^댓글 \d+개 모두 보기$/);
  await expect(page.getByText("정상 사진도 보고 싶어요.")).toHaveCount(0);

  await more.click();
  await expect(more).toHaveCount(0);
  await expect(page.getByText("정상 사진도 보고 싶어요.")).toBeVisible();
  expect(await tops(page).count()).toBeGreaterThan(5);
  await expect(page).toHaveURL(new RegExp(`${LONG}$`));
  const focusedRow = await page.evaluate(() => document.activeElement?.closest("li[data-comment-top]")?.getAttribute("data-comment-top"));
  expect(focusedRow, "focus lands on the first comment that was hidden").toBe(await tops(page).nth(5).getAttribute("data-comment-top"));
});

test("a link to a comment past the fifth opens the thread expanded and lands on it", async ({ page }) => {
  await page.goto(`${LONG}#comment-55`);
  const row = page.locator("#comment-55");
  await expect(row).toBeInViewport({ timeout: 30_000 });
  await expect(page.getByTestId("comments-show-all")).toHaveCount(0);
});

test("authors read as name then @handle wherever the name is known", async ({ page }) => {
  await page.goto("/ko/blog");
  await expect(page.locator('main [data-post-id] header a[href="/ko/p/minji"]').first()).toHaveText("민지@minji", {
    timeout: 30_000,
  });
  await expect(page.locator('main [data-post-id] header a[href="/ko/p/haruka"]').first()).toHaveText(/^H?@haruka$/);

  await page.goto("/ko/p/minji/pricing-experiment-free-to-pro");
  const rail = page.locator("aside").first().locator('a[href="/ko/p/minji"]');
  await expect(rail).toHaveText("민지@minji", { timeout: 30_000 });
  await expect(page.getByTestId("post-author-card").locator('a[href="/ko/p/minji"]')).toContainText("민지@minji");
});

test("posting while the thread is folded opens it so the new comment shows", async ({ page }) => {
  await page.goto(LONG);
  await expect(page.getByTestId("comments-show-all")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("comment-composer-placeholder").click();
  const composer = page.locator("#comments [data-testid='conversation-composer'] textarea");
  await expect(composer).toHaveCount(1, { timeout: 20_000 });
  await composer.fill("접힌 채로 남긴 댓글");
  await page.getByRole("button", { name: "댓글 작성" }).click();
  await expect(page.locator("#comments").getByText("접힌 채로 남긴 댓글")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("comments-show-all")).toHaveCount(0);
});
