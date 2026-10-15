import { expect, test } from "@playwright/test";

// mock-on 레인: 알림 목은 2026-06-07T11:40Z·11:30Z 에 왔고, 작성 목 초안은 페이지가 열린 시각에 고쳐졌다.
test.use({ viewport: { width: 1280, height: 900 } });

test("알림은 '3분 전'이 아니라 '3분'처럼 짧게, 일주일이 지나면 날짜로 보인다", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-06-07T11:43:00Z"));
  await page.goto("/ko/blog/notifications");
  const main = page.locator("main");
  await expect(main.getByText("3분", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await expect(main.getByText("13분", { exact: true }).first()).toBeVisible();
  await expect(main.getByText(/분 전$/)).toHaveCount(0);

  await page.clock.setFixedTime(new Date("2026-06-20T12:00:00Z"));
  await page.reload();
  await expect(main.getByText("6월 7일", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
});

test("작성 목록의 방금 고친 초안은 '지금'이 아니라 '방금'이다", async ({ page }) => {
  await page.goto("/ko/blog/write");
  const card = page.getByRole("link", { name: /이어서 쓰기/ });
  await expect(card).toContainText("방금", { timeout: 30_000 });
  await expect(page.locator("main").getByText("지금", { exact: true })).toHaveCount(0);
});

test("방금 올린 댓글의 시간은 '방금'이다", async ({ page }) => {
  await page.goto("/ko/p/dohyun/nextjs-14-app-router-blog");
  await page.getByTestId("comment-composer-placeholder").click();
  const composer = page.locator("#comments [data-testid='conversation-composer'] textarea");
  await expect(composer).toHaveCount(1, { timeout: 20_000 });
  await composer.fill("시간 표기 확인용 댓글");
  await page.keyboard.press("Control+Enter");
  const mine = page.locator("#comments [id^='comment-']").filter({ hasText: "시간 표기 확인용 댓글" });
  await expect(mine.locator("time")).toHaveText("방금");
});
