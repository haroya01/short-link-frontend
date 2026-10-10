import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });

test("ja: the compose entry says 書く, my posts say 記事, and 投稿 is left to sending a note", async ({ page }) => {
  await page.goto("/ja/blog");
  const trigger = page.locator('header.vt-app-header [data-compose-trigger="desktop"]');
  await expect(trigger).toHaveText("書く", { timeout: 30_000 });
  await trigger.click();
  await expect(page.getByRole("menu", { name: "書く" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/ja/blog/write");
  await expect(page.getByRole("heading", { level: 1, name: "記事一覧" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: "記事", exact: true }).first()).toHaveAttribute("href", /\/write$/);

  await page.goto("/ja/blog/notes");
  await expect(page.getByRole("button", { name: "投稿", exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/^今週 \d+人が使いました$/).first()).toBeVisible();
});

test("ja: a confirm question ends in a full-width mark", async ({ page }) => {
  await page.goto("/ja/p/dohyun/nextjs-14-app-router-blog");
  await page.getByRole("button", { name: "削除", exact: true }).first().click({ timeout: 30_000 });
  await expect(page.getByRole("dialog", { name: "この記事を削除しますか？" })).toBeVisible();
});

test("en: a counted line goes through the plural, and a connection reads as who added it where", async ({ page }) => {
  await page.goto("/en/blog");
  await expect(page.locator("main").getByText(/^In “.+” and 2 more collections$/).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("main li[data-connection-event]").first().locator("> div").first()).toContainText(
    /added this to the .+ path/,
  );
});

test("ko: a connection names the curator with 님이, whatever their handle ends in", async ({ page }) => {
  await page.goto("/ko/blog");
  const context = page.locator("main li[data-connection-event]").first().locator("> div").first();
  await expect(context).toContainText(/님이 .+에 엮음/, { timeout: 30_000 });
});
