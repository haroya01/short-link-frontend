import { expect, test } from "@playwright/test";

// Mock lane: the viewer keeps aside notices from people they don't follow; promo_bot (3) and
// mina@mastodon.social (1) wait in the filtered inbox.
test.use({ viewport: { width: 1280, height: 900 } });

test("each kind of sender gets accept, filter or drop in blog settings", async ({ page }) => {
  await page.goto("/ko/blog/settings");
  const notFollowing = page.getByTestId("policy-forNotFollowing");
  await expect(notFollowing.getByRole("radio", { name: "거르기" })).toHaveAttribute("aria-checked", "true", {
    timeout: 30_000,
  });
  const newAccounts = page.getByTestId("policy-forNewAccounts");
  await expect(newAccounts.getByRole("radio", { name: "받기" })).toHaveAttribute("aria-checked", "true");
  await newAccounts.getByRole("radio", { name: "버리기" }).click();
  await expect(newAccounts.getByRole("radio", { name: "버리기" })).toHaveAttribute("aria-checked", "true");
});

test("kept notices wait atop the feed and are accepted or dismissed per sender", async ({ page }) => {
  await page.goto("/ko/blog/notifications");
  const entry = page.locator("main").getByTestId("filtered-entry");
  await expect(entry).toContainText("2명이 보낸 알림 4개", { timeout: 30_000 });
  await entry.click();
  await expect(page).toHaveURL(/\/notifications\/filtered$/);

  const promo = page.getByTestId("filtered-promo_bot");
  await expect(promo).toContainText("알림 3개");
  await promo.getByTestId("filtered-accept").click();
  await expect(promo).toHaveCount(0);
  await expect(page.getByText("promo_bot님의 알림을 받아요")).toBeVisible();

  const mina = page.getByTestId("filtered-mina@mastodon.social");
  await expect(mina.getByRole("link")).toHaveAttribute("href", /\/remote\/9800$/);
  await mina.getByTestId("filtered-dismiss").click();
  await expect(page.getByText("걸러진 알림이 없어요")).toBeVisible();
});
