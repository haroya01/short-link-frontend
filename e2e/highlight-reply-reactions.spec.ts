import { expect, test, type Page } from "@playwright/test";

// mock-on 레인. 하이라이트 4001 에는 haruka 의 답글(좋아요 2)과 rin 의 답글이 있다. 목 독자 dohyun 은
// rin 을 차단해 둬서 로그인하면 rin 의 답글이 빠진다. kurl:mock-fail:highlight-reply-like 가 있는 동안
// 답글 좋아요는 실패한다.
test.use({ viewport: { width: 1280, height: 900 } });

const HL_THREAD = "/ko/p/sora/posthog-funnel?highlightId=4001&thread=1";

const harukaRow = (page: Page) => page.getByRole("dialog").locator("li").filter({ hasText: "저도 이 기준으로 봐요." });

test("하이라이트 답글의 좋아요는 댓글처럼 수와 함께 오르내린다", async ({ page }) => {
  await page.goto(HL_THREAD);
  const like = harukaRow(page).getByRole("button", { name: "좋아요" });
  await expect(like).toHaveText("2", { timeout: 20_000 });
  await expect(like).toHaveAttribute("aria-pressed", "false");

  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "true");
  await expect(like).toHaveText("3");
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "false");
  await expect(like).toHaveText("2");
});

test("좋아요가 서버에 닿지 못하면 하트와 수가 원래대로 돌아온다", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:mock-fail:highlight-reply-like", "1"));
  await page.goto(HL_THREAD);
  const like = harukaRow(page).getByRole("button", { name: "좋아요" });
  await expect(like).toHaveText("2", { timeout: 20_000 });
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "false");
  await expect(like).toHaveText("2");
});

test("남의 하이라이트 답글은 ⋯ 에서 그 답글로 신고한다", async ({ page }) => {
  await page.goto(HL_THREAD);
  const row = harukaRow(page);
  await row.getByRole("button", { name: "댓글 메뉴" }).click({ timeout: 20_000 });
  await row.getByRole("menuitem", { name: "신고" }).click();

  const report = page.getByRole("dialog", { name: "이 답글 신고" });
  await expect(report).toBeInViewport();
  await report.getByRole("radio", { name: "스팸·광고" }).check();
  await expect(report.getByRole("button", { name: "신고", exact: true })).toBeInViewport();
  await report.getByRole("button", { name: "신고", exact: true }).click();
  await expect(report.getByRole("status")).toHaveText("신고가 접수됐어요.");
  await expect(page.getByRole("dialog", { name: /같은 부하로 비교했다/ })).toBeVisible();
});

test("내 답글에는 ⋯ 없이 하트와 삭제만 있고, 내 답글에도 좋아요를 누를 수 있다", async ({ page }) => {
  await page.goto(HL_THREAD);
  const thread = page.getByRole("dialog");
  const field = thread.getByRole("textbox", { name: "답글 쓰기" });
  await field.click({ timeout: 20_000 });
  await field.fill("부하 조건까지 적어 두면 좋겠네요.");
  await thread.getByTestId("conversation-composer").getByRole("button", { name: "답글", exact: true }).click();

  const mine = thread.locator("li").filter({ hasText: "부하 조건까지 적어 두면 좋겠네요." });
  await expect(mine).toBeVisible();
  await expect(mine.getByRole("button", { name: "댓글 메뉴" })).toHaveCount(0);
  await expect(mine.getByRole("button", { name: "삭제" })).toBeVisible();
  const like = mine.getByRole("button", { name: "좋아요" });
  await expect(mine.getByTestId("like-count")).toHaveCount(0);
  await like.click();
  await expect(like).toHaveText("1");
});

test("로그인하지 않은 독자는 좋아요를 누르면 로그인을 묻고, ⋯ 에는 신고만 있다", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:mock-signed-out", "1"));
  await page.goto(HL_THREAD);
  const row = harukaRow(page);
  await row.getByRole("button", { name: "댓글 메뉴" }).click({ timeout: 20_000 });
  await expect(row.getByRole("menuitem")).toHaveText(["신고"]);
  await row.getByRole("button", { name: "댓글 메뉴" }).click();

  await row.getByRole("button", { name: "좋아요" }).click();
  await expect(page.getByRole("dialog", { name: "좋아요를 누르려면 로그인하세요" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: /같은 부하로 비교했다/ })).toHaveCount(0);
});
