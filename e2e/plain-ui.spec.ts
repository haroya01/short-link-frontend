import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });

const POST = "/ko/p/dohyun/nextjs-14-app-router-blog";

test("추천 in the feed's 더 보기 wears binoculars, and nothing on the feed sparkles", async ({ page }) => {
  await page.goto("/ko/blog");
  const switcher = page.locator('header[data-feed-switcher="blog"]');
  await expect(switcher.locator("[data-feed-more]")).toBeVisible({ timeout: 30_000 });
  await switcher.getByRole("button", { name: "더 보기" }).click();
  const pick = page.getByRole("menuitem", { name: "추천" });
  await expect(pick.locator("svg.lucide-binoculars")).toHaveCount(1);
  await expect(page.locator("svg.lucide-sparkles")).toHaveCount(0);
});

test("the composers ask in two words: 노트 쓰기 and 댓글 쓰기", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  await expect(page.getByRole("textbox", { name: "노트 쓰기", exact: true })).toBeVisible({ timeout: 30_000 });

  await page.goto(POST);
  await expect(page.getByTestId("comment-composer-placeholder")).toContainText("댓글 쓰기", { timeout: 30_000 });
});

test("the topics page says what it holds instead of inviting a browse", async ({ page }) => {
  await page.goto("/ko/blog/tags");
  await expect(page.getByText("kurl log 글에 붙은 주제와 최근 글이에요.", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("main")).not.toContainText("둘러보세요");
});

test("서재 names its sections without a grey line restating them", async ({ page }) => {
  await page.goto("/ko/blog/curation");
  for (const name of ["좋아요한 글", "내 댓글", "팔로우한 주제"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible({ timeout: 30_000 });
  }
});

test("the shortener asks for a long URL in a few words, without '여기에' or an invitation", async ({ page }) => {
  await page.goto("/ko");
  await expect(page.getByPlaceholder("긴 주소 붙여넣기", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("main")).not.toContainText("보세요");
});
