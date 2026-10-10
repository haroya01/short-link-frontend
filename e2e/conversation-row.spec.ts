import { expect, test } from "@playwright/test";

// mock-on 레인: 댓글 1(민지, 좋아요 3)은 표시 이름이 있고 답글 2(dohyun)는 없다. 하이라이트 4001에는
// haruka·rin 의 답글이 있다(목 독자 dohyun 은 rin 을 차단해 둬서 rin 은 보이지 않는다).
test.use({ viewport: { width: 1280, height: 900 } });

const POST = "/ko/p/dohyun/nextjs-14-app-router-blog";
const HL_THREAD = "/ko/p/sora/posthog-funnel?highlightId=4001&thread=1";

test("댓글은 표시 이름 · @핸들 · 시간으로 읽히고, 좋아요는 수와 함께 오르내린다", async ({ page }) => {
  await page.goto(POST);
  const first = page.locator("#comment-1");
  await expect(first.getByRole("link", { name: "민지 @minji" })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#comment-2").getByRole("link", { name: "@dohyun", exact: true })).toBeVisible();

  const like = first.getByRole("button", { name: "좋아요" });
  await expect(like).toHaveText("3");
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "true");
  await expect(like).toHaveText("4");
  await like.click();
  await expect(like).toHaveText("3");
  await expect(page.locator("#comment-2").getByTestId("like-count")).toHaveCount(0);
});

test("하이라이트 답글도 같은 줄이고, 답글은 그 사람을 불러 작성기에 넣고, ⋯은 시트 위로 묻는다", async ({ page }) => {
  await page.goto(HL_THREAD);
  const thread = page.getByRole("dialog");
  const row = thread.locator("li").filter({ hasText: "저도 이 기준으로 봐요." });
  await expect(row.getByRole("link", { name: "@haruka", exact: true })).toBeVisible({ timeout: 20_000 });

  await row.getByRole("button", { name: "답글", exact: true }).click();
  const field = thread.getByRole("textbox", { name: "답글 쓰기" });
  await expect(field).toHaveValue("@haruka ");
  await expect(field).toBeFocused();

  await row.getByRole("button", { name: "댓글 메뉴" }).click();
  await row.getByRole("menuitem", { name: /차단/ }).click();
  const ask = page.getByRole("dialog", { name: /haruka/ });
  await ask.getByRole("button", { name: "취소" }).click();
  await expect(ask).toHaveCount(0);
  await expect(thread).toBeVisible();
});
