import { test, expect, type Page } from "@playwright/test";

/**
 * Blocking from a post and from a comment, in MOCK-ON. The mock session is @dohyun; every post serves
 * the same comments (minji, dohyun, kazuki); the mock block list starts with @mallory. Blocks live for
 * the SPA session — a reload resets them.
 */
test.use({ viewport: { width: 1280, height: 900 } });

async function confirmBlock(page: Page, username: string) {
  const ask = page.getByRole("dialog", { name: `${username}님을 차단할까요?` });
  await expect(ask).toContainText("서로의 팔로우와 대기 중인 팔로우 요청도 양쪽 다 끊어져요");
  await ask.getByRole("button", { name: "차단", exact: true }).click();
  await expect(page.getByText(`${username}님을 차단했어요`, { exact: false })).toBeVisible();
}

test("a reader's ⋯ on a post is the one place to report it, and blocks its author", async ({ page }) => {
  await page.goto("/ko/p/kazuki/kyoto-workation");
  const menu = page.locator("article header").getByRole("button", { name: "글 메뉴", exact: true });
  await menu.click({ timeout: 30_000 });
  await expect(page.locator("article").getByRole("button", { name: "신고", exact: true })).toHaveCount(0);
  await page.getByRole("menuitem", { name: "신고", exact: true }).click();
  const report = page.getByRole("dialog", { name: "이 글 신고" });
  await expect(report.getByRole("radio").first()).toBeVisible();
  await report.getByRole("button", { name: "취소" }).click();
  await expect(report).toHaveCount(0);

  await menu.click();
  await page.getByRole("menuitem", { name: "차단", exact: true }).click();
  await confirmBlock(page, "kazuki");
  await expect(page.locator("#comment-3")).toHaveCount(0, { timeout: 30_000 });
  await expect(menu).toHaveCount(0);
  await expect(page.getByTestId("author-blocked").getByRole("button", { name: "차단 해제" })).toBeVisible();
});

test("my own post has no reader's ⋯", async ({ page }) => {
  await page.goto("/ko/p/dohyun/nextjs-14-app-router-blog");
  await expect(page.locator(".prose-post")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "글 메뉴", exact: true })).toHaveCount(0);
});

test("a comment's ⋯ blocks its writer, whose comments then leave the post", async ({ page }) => {
  await page.goto("/ko/p/haruka/hexagonal-too-much");
  const minji = page.locator("#comment-1");
  await expect(minji).toContainText("minji", { timeout: 30_000 });
  await expect(page.locator("#comment-2").getByRole("button", { name: "댓글 메뉴" })).toHaveCount(0);

  await minji.getByRole("button", { name: "댓글 메뉴" }).first().click();
  await expect(page.getByRole("menuitem", { name: "신고", exact: true })).toBeVisible();
  await page.getByRole("menuitem", { name: "차단", exact: true }).click();
  await confirmBlock(page, "minji");
  await expect(page.locator("#comment-1")).toHaveCount(0);
  await expect(page.locator("#comment-3")).toContainText("kazuki");
});

test("someone else's followers list leaves out people I blocked", async ({ page }) => {
  await page.goto("/ko/p/yuna");
  await page.getByRole("button", { name: /^팔로워 \d/ }).click({ timeout: 30_000 });
  const list = page.getByRole("dialog", { name: "팔로워" });
  await expect(list.getByRole("link", { name: "@haneul" })).toBeVisible();
  await expect(list.getByText("@mallory")).toHaveCount(0);
});
