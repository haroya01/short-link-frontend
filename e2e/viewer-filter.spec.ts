import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });

const RIN_COMMENT = "새벽에 다시 읽으니 더 좋네요.";
const RIN_NOTE = "불 끄고 나서야 써지는 문장이 있다.";
const RIN_POST = "/ko/p/rin/quiet-hours";

async function serverHtml(page: Page, path: string) {
  return (await page.request.get(path)).text();
}

test("the connection stream drops rin's connection once the page knows who is reading", async ({ page }) => {
  const html = await serverHtml(page, "/ko/blog");
  expect(html.indexOf('data-connection-event="509"')).toBeGreaterThan(-1);
  expect(html.indexOf('data-connection-event="509"')).toBeLessThan(html.indexOf('data-connection-event="501"'));
  await page.goto("/ko/blog");
  const connections = page.locator("main li[data-connection-event]");
  await expect(connections.first()).toHaveAttribute("data-connection-event", "501", { timeout: 30_000 });
  await expect(page.locator('main li[data-connection-event="509"]')).toHaveCount(0);
});

test("comments leave out what rin wrote", async ({ page }) => {
  await page.goto("/ko/p/dohyun/nextjs-14-app-router-blog");
  await expect(page.locator("#comment-1")).toContainText("minji", { timeout: 30_000 });
  await expect(page.locator("#comment-3")).toContainText("kazuki");
  await expect(page.locator("#comment-5")).toHaveCount(0);
  await expect(page.getByText(RIN_COMMENT)).toHaveCount(0);
});

test("highlights and their replies leave out what rin wrote", async ({ page }) => {
  await page.goto("/ko/p/sora/posthog-funnel");
  const minji = page.locator("mark.kurl-highlight", { hasText: "도입 전후를 같은 부하로 비교했다." });
  await expect(minji).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("mark.kurl-highlight", { hasText: "요약하면" })).toHaveCount(0);

  await minji.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => {
      const before = await page.evaluate(() => window.scrollY);
      await page.waitForTimeout(200);
      return (await page.evaluate(() => window.scrollY)) === before;
    })
    .toBe(true);
  await minji.click();
  await page.getByTestId("highlight-card-conversation-4001").click();
  const thread = page.getByRole("dialog");
  await expect(thread).toContainText("저도 이 기준으로 봐요.", { timeout: 15_000 });
  await expect(thread).not.toContainText("부하 조건을 더 적어 주면 좋겠어요.");
});

test("a note rin wrote turns unavailable once the reader's own request comes back 404", async ({ page }) => {
  expect(await serverHtml(page, "/ko/p/rin/notes/90")).toContain(RIN_NOTE);
  await page.goto("/ko/p/rin/notes/90");
  await expect(page.getByTestId("note-unavailable")).toHaveText("볼 수 없는 노트예요.", { timeout: 30_000 });
  await expect(page.getByText(RIN_NOTE)).toHaveCount(0);
});

test("rin's profile shows the neutral line instead of the tabs' content, with no follow button", async ({ page }) => {
  await page.goto("/ko/p/rin");
  await expect(page.getByTestId("author-unavailable")).toHaveText("이 사용자의 글을 볼 수 없어요.", { timeout: 30_000 });
  await expect(page.locator("main").getByTestId("follow-button")).toHaveCount(0);
  await expect(page.getByTestId("author-blocked")).toHaveCount(0);
});

test("rin's post keeps its title and author but not its body, comments, actions or contents", async ({ page }) => {
  const html = await serverHtml(page, RIN_POST);
  expect(html).toContain("prose-post");
  expect(html).toContain("data-post-actions");
  await page.goto(RIN_POST);
  await expect(page.getByTestId("author-unavailable")).toHaveText("볼 수 없는 글이에요.", { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1, name: "밤 열한 시의 작업 노트" })).toBeVisible();
  await expect(page.locator(".prose-post")).toHaveCount(0);
  await expect(page.getByTestId("follow-button")).toHaveCount(0);
  await expect(page.locator("[data-post-actions]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "글 메뉴" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "목차" })).toHaveCount(0);
  await expect(page.locator("aside").getByRole("link", { name: "@rin" })).toBeVisible();
});

test("on a phone, rin's post has no 목차 button either", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(RIN_POST);
  await expect(page.getByTestId("author-unavailable")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "목차" })).toHaveCount(0);
  await expect(page.locator("[data-post-actions]")).toHaveCount(0);
});

test("a post by someone the reader blocks shows the blocked notice in place of the body, and unblocking brings it back", async ({ page }) => {
  await page.goto("/ko/p/sora/design-tokens-to-tailwind");
  await expect(page.locator(".prose-post")).toBeVisible({ timeout: 30_000 });
  const menu = page.locator("article header").getByRole("button", { name: "글 메뉴", exact: true });
  await menu.click();
  await page.getByRole("menuitem", { name: "차단", exact: true }).click();
  await page.getByRole("dialog", { name: "sora님을 차단할까요?" }).getByRole("button", { name: "차단", exact: true }).click();

  const notice = page.getByTestId("author-blocked");
  await expect(notice).toContainText("차단한 사용자예요");
  await expect(page.locator(".prose-post")).toHaveCount(0);
  await expect(page.getByTestId("author-unavailable")).toHaveCount(0);
  await expect(page.locator("[data-post-actions]")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "목차" })).toHaveCount(0);

  await notice.getByRole("button", { name: "차단 해제" }).click();
  await expect(page.locator(".prose-post")).toBeVisible();
  await expect(page.locator("[data-post-actions]")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "목차" })).toBeVisible();
});
