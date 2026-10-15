import { expect, test } from "@playwright/test";
import { expectOnTop, toastBy } from "./helpers/on-top";

// mock-on 레인: 댓글 6 은 답글(7, haruka)이 남은 채 지워진 댓글이다(deleted: true, 본문·작성자 없음).
test.use({ viewport: { width: 1280, height: 900 } });

const POST = "/ko/p/dohyun/nextjs-14-app-router-blog";

test("답글이 남은 지운 댓글은 이름·본문 없이 자리만 남고, 답글은 그대로 있다", async ({ page }) => {
  await page.goto(POST);
  const tombstone = page.locator("#comment-6");
  await expect(tombstone).toHaveText("삭제된 댓글이에요", { timeout: 20_000 });
  await expect(tombstone.locator("a, button, time")).toHaveCount(0);

  const reply = page.locator("#comment-7");
  await expect(reply.getByText("지워진 댓글에 남은 답글이에요.")).toBeVisible();
  await expect(reply.getByRole("button", { name: "답글", exact: true })).toHaveCount(0);
  await expect(page.locator("#comments").getByText("댓글 5개", { exact: true })).toBeVisible();
});

test("답글이 달린 내 댓글을 지우면 자리와 답글이 남고, 마지막 답글까지 지우면 자리도 사라진다", async ({ page }) => {
  await page.goto(POST);
  await page.getByTestId("comment-composer-placeholder").click();
  const composer = page.locator("#comments [data-testid='conversation-composer'] textarea");
  await expect(composer).toHaveCount(1, { timeout: 20_000 });
  await composer.fill("곧 지울 내 댓글");
  await page.keyboard.press("Control+Enter");
  const mine = page.locator("#comments li").filter({ hasText: "곧 지울 내 댓글" }).first();
  await expect(mine).toBeVisible();
  const parentId = await mine.locator("[id^='comment-']").first().getAttribute("id");

  await page.locator(`#${parentId}`).getByRole("button", { name: "답글", exact: true }).click();
  await composer.fill("남아야 할 답글");
  await page.keyboard.press("Control+Enter");
  const reply = page.locator("#comments [id^='comment-']").filter({ hasText: "남아야 할 답글" });
  await expect(reply).toBeVisible();

  await page.locator(`#${parentId}`).getByRole("button", { name: "삭제" }).click();
  await page.getByRole("dialog", { name: "이 댓글을 삭제할까요?" }).getByRole("button", { name: "삭제" }).click();
  await expect(page.locator(`#${parentId}`)).toHaveText("삭제된 댓글이에요");
  await expect(reply).toBeVisible();
  await expect(page.locator("#comments").getByText("댓글 6개", { exact: true })).toBeVisible();

  await reply.getByRole("button", { name: "삭제" }).click();
  await page.getByRole("dialog", { name: "이 댓글을 삭제할까요?" }).getByRole("button", { name: "삭제" }).click();
  await expect(page.locator(`#${parentId}`)).toHaveCount(0);
  await expect(page.locator("#comments").getByText("댓글 5개", { exact: true })).toBeVisible();
});

test("같은 글 안에서 주소의 #댓글만 바뀌어도 그 댓글로 가서 반짝인다", async ({ page }) => {
  await page.goto(POST);
  await expect(page.locator("#comment-1")).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.location.hash = "#comment-3";
  });
  const target = page.locator("#comment-3");
  await expect(target).toHaveClass(/bg-accent-50/);
  await expect(target).toBeInViewport();
});

test("가리킨 댓글이 없으면 댓글 맨 위로 가며 그렇다고 말한다", async ({ page }) => {
  await page.goto(`${POST}#comment-999`);
  await expectOnTop(toastBy(page, "이 댓글은 삭제됐거나 볼 수 없어요."), { timeout: 20_000 });
  await expect(page.locator("#comments")).toBeInViewport();
});
