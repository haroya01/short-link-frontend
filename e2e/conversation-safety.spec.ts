import { expect, test, type Page } from "@playwright/test";

// mock-on 레인. kurl:mock-signed-out 은 목 세션을 만들지 않고, 지우고 다시 열면 로그인한 채로 돌아온다
// (OAuth 왕복의 끝과 같다). kurl:mock-fail:<읽기> 가 있는 동안 그 목 읽기는 실패한다.
test.use({ viewport: { width: 1280, height: 900 } });

const POST = "/ko/p/dohyun/nextjs-14-app-router-blog";
const HL_POST = "/ko/p/sora/posthog-funnel";
const HL_THREAD = `${HL_POST}?highlightId=4001&thread=1`;

async function signedOut(page: Page) {
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("e2e:signed-in")) window.localStorage.setItem("kurl:mock-signed-out", "1");
  });
}

async function signInAndReturn(page: Page) {
  await page.route("**/oauth2/authorization/google", (route) => route.fulfill({ status: 200, body: "google" }));
  await Promise.all([
    page.waitForURL(/\/oauth2\/authorization\/google$/),
    page.getByRole("dialog").getByRole("button", { name: "Google 계정으로 로그인" }).click(),
  ]);
  const next = decodeURIComponent((await page.context().cookies()).find((c) => c.name === "kurl_login_next")?.value ?? "");
  expect(next).not.toBe("");
  // Google 시작 주소는 API 오리진(CI 에선 localhost:0)이라, 로그인은 앱 오리진에 돌아와서 해야 한다.
  await page.addInitScript(() => {
    window.sessionStorage.setItem("e2e:signed-in", "1");
    window.localStorage.removeItem("kurl:mock-signed-out");
  });
  await page.goto(next);
  return next;
}

const editors = (page: Page, scope: string) => page.locator(`${scope} [data-testid='conversation-composer'] textarea`);

test("비로그인 답글은 먼저 로그인을 묻고, 돌아오면 그 댓글의 답글 칸이 열려 있다", async ({ page }) => {
  await signedOut(page);
  await page.goto(POST);
  const reply = page.locator("#comments").getByRole("button", { name: "답글", exact: true }).first();
  const target = await reply.evaluate((b) => b.closest("[id^='comment-']")?.id ?? "");
  await reply.click();
  await expect(page.getByRole("dialog", { name: "답글을 달려면 로그인하세요" })).toBeVisible();
  await expect(editors(page, "#comments")).toHaveCount(0);

  const next = await signInAndReturn(page);
  expect(next).toContain(`#${target}`);
  const composer = editors(page, "#comments");
  await expect(composer).toHaveCount(1, { timeout: 20_000 });
  await composer.click();
  await page.keyboard.type("돌아와서 쓰는 답글");
  await page.keyboard.press("Control+Enter");
  await expect(page.locator("#comments").getByText("돌아와서 쓰는 답글")).toBeVisible();
});

test("쓰던 댓글은 새로고침해도 남고, 올리면 지워진다", async ({ page }) => {
  await page.goto(POST);
  await page.getByTestId("comment-composer-placeholder").click();
  const composer = editors(page, "#comments");
  await expect(composer).toHaveCount(1, { timeout: 20_000 });
  await composer.click();
  await page.keyboard.type("새로고침 전 초안");
  await page.reload();
  await expect(editors(page, "#comments")).toHaveValue("새로고침 전 초안", { timeout: 20_000 });

  await page.getByRole("button", { name: "댓글 작성" }).click();
  await expect(page.locator("#comments li").getByText("새로고침 전 초안")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("comment-composer-placeholder")).toBeVisible({ timeout: 20_000 });
});

test("댓글을 못 불러오면 빈 목록이 아니라 다시 시도 줄을 보이고, 다시 시도하면 채워진다", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:mock-fail:comments", "1"));
  await page.goto(POST);
  const failed = page.getByTestId("comments-load-failed");
  await expect(failed).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#comments li")).toHaveCount(0);
  await page.evaluate(() => window.localStorage.removeItem("kurl:mock-fail:comments"));
  await failed.getByRole("button", { name: "다시 시도" }).click();
  await expect(failed).toHaveCount(0);
  await expect(page.locator("#comments li").first()).toBeVisible();
});

test("비로그인 하이라이트 대화에는 작성기 대신 로그인 줄이 있고, 로그인하면 그 대화로 돌아온다", async ({ page }) => {
  await signedOut(page);
  await page.goto(HL_THREAD);
  const thread = page.getByRole("dialog");
  await expect(thread.getByTestId("sign-in-row")).toBeVisible({ timeout: 20_000 });
  await expect(editors(page, "[role='dialog']")).toHaveCount(0);
  await thread.getByTestId("sign-in-row").click();
  await expect(page.getByRole("dialog", { name: "답글을 달려면 로그인하세요" })).toBeVisible();

  const next = await signInAndReturn(page);
  expect(next).toContain("highlightId=4001");
  expect(next).toContain("thread=1");
  await expect(editors(page, "[role='dialog']")).toHaveCount(1, { timeout: 20_000 });
});

test("하이라이트 답글을 못 불러오면 다시 시도 줄을 보이고, 다시 시도하면 채워진다", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:mock-fail:highlight-replies", "1"));
  await page.goto(HL_THREAD);
  const thread = page.getByRole("dialog");
  const failed = thread.getByTestId("highlight-replies-load-failed");
  await expect(failed).toBeVisible({ timeout: 20_000 });
  await expect(thread.getByText("아직 답글이 없어요")).toHaveCount(0);
  await page.evaluate(() => window.localStorage.removeItem("kurl:mock-fail:highlight-replies"));
  await failed.getByRole("button", { name: "다시 시도" }).click();
  await expect(failed).toHaveCount(0);
  await expect(thread.getByText("저도 이 기준으로 봐요.")).toBeVisible();
});

test("쓰던 하이라이트 답글은 다시 열어도 남고, 닫기 전에 묻는다", async ({ page }) => {
  await page.goto(HL_THREAD);
  const thread = page.getByRole("dialog", { name: /같은 부하로 비교했다/ });
  const composer = editors(page, "[role='dialog']");
  await expect(composer).toHaveCount(1, { timeout: 20_000 });
  await composer.click();
  await page.keyboard.type("쓰던 답글");

  await page.goto(HL_THREAD);
  await expect(editors(page, "[role='dialog']")).toHaveValue("쓰던 답글", { timeout: 20_000 });

  await editors(page, "[role='dialog']").click();
  await page.keyboard.press("Escape");
  const ask = page.getByRole("dialog", { name: "쓰던 답글을 버릴까요?" });
  await ask.getByRole("button", { name: "계속 쓰기" }).click();
  await expect(ask).toHaveCount(0);
  await expect(thread).toBeVisible();
  await expect(editors(page, "[role='dialog']")).toHaveValue("쓰던 답글");

  await page.keyboard.press("Escape");
  await page.getByRole("dialog", { name: "쓰던 답글을 버릴까요?" }).getByRole("button", { name: "버리기" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto(HL_THREAD);
  await expect(editors(page, "[role='dialog']")).toHaveCount(1, { timeout: 20_000 });
  await expect(editors(page, "[role='dialog']")).toHaveValue("");
});

test("내 하이라이트 답글은 묻고 나서 지운다", async ({ page }) => {
  await page.goto(HL_THREAD);
  const thread = page.getByRole("dialog");
  const composer = editors(page, "[role='dialog']");
  await expect(composer).toHaveCount(1, { timeout: 20_000 });
  await composer.click();
  await page.keyboard.type("지울 답글");
  await page.keyboard.press("Control+Enter");
  const mine = thread.locator("li").filter({ hasText: "지울 답글" });
  await expect(mine).toBeVisible();

  await mine.getByRole("button", { name: "삭제" }).click();
  const ask = page.getByRole("dialog", { name: "이 답글을 삭제할까요?" });
  await ask.getByRole("button", { name: "취소" }).click();
  await expect(mine).toBeVisible();
  await mine.getByRole("button", { name: "삭제" }).click();
  await page.getByRole("dialog", { name: "이 답글을 삭제할까요?" }).getByRole("button", { name: "삭제" }).click();
  await expect(mine).toHaveCount(0);
});

test("노트 스레드는 로그인 여부를 확인하기 전에 로그인 줄을 보이지 않는다", async ({ page }) => {
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.querySelector("[data-testid='sign-in-row']")) (window as unknown as { __sawSignInRow: boolean }).__sawSignInRow = true;
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/ko/p/haruka/notes/30");
  await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => (window as unknown as { __sawSignInRow?: boolean }).__sawSignInRow ?? false)).toBe(false);
});

test("쓰던 노트 답글은 새로고침해도 남는다", async ({ page }) => {
  await page.goto("/ko/p/haruka/notes/30");
  const reply = page.locator("section[aria-labelledby='note-replies']").getByRole("textbox").first();
  await expect(reply).toBeVisible({ timeout: 20_000 });
  await reply.click();
  await page.keyboard.type("노트에 다는 답글 초안");
  await page.reload();
  await expect(page.locator("section[aria-labelledby='note-replies']").getByRole("textbox").first()).toHaveValue(
    "노트에 다는 답글 초안",
    { timeout: 20_000 },
  );
});
