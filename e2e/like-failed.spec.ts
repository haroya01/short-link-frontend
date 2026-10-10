import { expect, test, type Page } from "@playwright/test";
import { expectOnTop, toastBy } from "./helpers/on-top";

// mock-on 레인. kurl:mock-fail:like 가 있는 동안 글·댓글·노트·하이라이트 답글의 좋아요는 모두 실패한다.
// 어느 좋아요든 원래대로 돌아가면서 같은 한 줄로 실패를 말해야 하고, 그 줄은 시트에 가리지 않아야 한다.
test.use({ viewport: { width: 1280, height: 900 } });

const saysItFailed = (page: Page) => expectOnTop(toastBy(page, "좋아요를 반영하지 못했어요"));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:mock-fail:like", "1"));
});

test("글 좋아요가 실패하면 되돌리고 그렇다고 말한다", async ({ page }) => {
  await page.goto("/ko/p/dohyun/nextjs-14-app-router-blog");
  const like = page.locator("article header").first().getByRole("button", { name: /글 좋아요$/ });
  await expect(like).toHaveAttribute("aria-pressed", "false", { timeout: 30_000 });
  await like.click();
  await saysItFailed(page);
  await expect(like).toHaveAttribute("aria-pressed", "false");
});

test("댓글 좋아요가 실패하면 수를 되돌리고 그렇다고 말한다", async ({ page }) => {
  await page.goto("/ko/p/dohyun/nextjs-14-app-router-blog");
  const like = page.locator("#comment-1").getByRole("button", { name: "좋아요" });
  await expect(like).toHaveText("3", { timeout: 30_000 });
  await like.click();
  await saysItFailed(page);
  await expect(like).toHaveText("3");
  await expect(like).toHaveAttribute("aria-pressed", "false");
});

test("노트 좋아요가 실패하면 되돌리고 그렇다고 말한다", async ({ page }) => {
  await page.goto("/ko/p/yuna/notes/70");
  const like = page.locator('article[data-note-id="70"]').getByRole("button", { name: "좋아요", exact: true });
  await like.click({ timeout: 30_000 });
  await saysItFailed(page);
  await expect(like).toHaveAttribute("aria-pressed", "false");
});

test("하이라이트 답글 좋아요가 실패하면 수를 되돌리고 시트 위에서 그렇다고 말한다", async ({ page }) => {
  await page.goto("/ko/p/sora/posthog-funnel?highlightId=4001&thread=1");
  const row = page.getByRole("dialog").locator("li").filter({ hasText: "저도 이 기준으로 봐요." });
  const like = row.getByRole("button", { name: "좋아요" });
  await expect(like).toHaveText("2", { timeout: 30_000 });
  await like.click();
  await saysItFailed(page);
  await expect(like).toHaveText("2");
  await expect(like).toHaveAttribute("aria-pressed", "false");
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("하이라이트 답글 좋아요 실패는 폰의 아래 시트에도 가리지 않는다", async ({ page }) => {
    await page.goto("/ko/p/sora/posthog-funnel?highlightId=4001&thread=1");
    const row = page.getByRole("dialog").locator("li").filter({ hasText: "저도 이 기준으로 봐요." });
    await row.getByRole("button", { name: "좋아요" }).click({ timeout: 30_000 });
    await saysItFailed(page);
  });
});
