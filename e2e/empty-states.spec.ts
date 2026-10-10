import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * One empty-state grammar in MOCK-ON: an icon, one line, at most one action, and a second line only on
 * first-run surfaces (feed tabs, notifications). `kurl:mock-empty=notifications` empties the
 * notification list.
 */

const empty = (page: Page) => page.getByTestId("blog-empty");

async function grammar(box: Locator, { title, body }: { title: string; body: boolean }) {
  await expect(box.locator("svg").first()).toBeVisible({ timeout: 30_000 });
  await expect(box.getByRole("heading", { level: 2 })).toHaveText(title);
  await expect(box.locator(":scope > p")).toHaveCount(body ? 1 : 0);
  expect(await box.locator(":scope > [data-empty-action] > *").count()).toBeLessThanOrEqual(1);
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("notifications: an icon, one line, why it fills up, and somewhere to go", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("kurl:mock-empty", "notifications"));
    await page.goto("/ko/blog/notifications");
    const box = empty(page);
    await grammar(box, { title: "아직 알림이 없어요", body: true });
    await expect(box).toContainText("팔로우한 작가의 새 글·좋아요·댓글 소식이 여기 모여요.");
    await box.getByRole("link", { name: "피드 둘러보기" }).click();
    await expect(page.locator('header[data-feed-switcher="blog"]')).toBeVisible({ timeout: 30_000 });
  });

  test("a post search with no match: the heading drops the 0, one line, topics to try, no second search box", async ({ page }) => {
    await page.goto("/ko/blog?q=%EC%9A%B0%EC%A3%BC%EC%84%A0");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("‘우주선’ 검색 결과", { timeout: 30_000 });
    const box = empty(page);
    await grammar(box, { title: "맞는 글이 없어요", body: false });
    await expect(box.getByRole("searchbox")).toBeHidden();
    await expect(box.getByText("대신 이런 주제는 어때요")).toBeVisible();
  });

  test("a note search with no match reads the same way", async ({ page }) => {
    await page.goto("/ko/blog?q=%EC%9A%B0%EC%A3%BC%EC%84%A0&view=notes");
    await grammar(empty(page), { title: "맞는 노트가 없어요", body: false });
  });

  test("an empty topic offers one way back to the topics", async ({ page }) => {
    await page.goto("/ko/blog/tags/%EC%97%86%EB%8A%94%EC%A3%BC%EC%A0%9C");
    const box = empty(page);
    await grammar(box, { title: "이 주제의 글이 없어요", body: false });
    await expect(box.getByRole("link", { name: /주제 둘러보기/ })).toBeVisible();
  });

  test("no bookmarked notes: the fact alone, no sentence about where the menu is", async ({ page }) => {
    await page.goto("/ko/blog/notes?feed=bookmarks");
    const box = empty(page);
    await grammar(box, { title: "북마크한 노트가 없어요", body: false });
    await expect(box).not.toContainText("메뉴");
  });

  test("no followed topics in 서재: one fact line and the way to the topics", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("kurl:mock-empty", "tagPrefs"));
    await page.goto("/ko/blog/curation?open=topics");
    const shelf = page.locator("#followed-topics");
    await expect(shelf.getByText("아직 팔로우한 주제가 없어요.", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(shelf).not.toContainText("보세요");
    await expect(shelf.getByRole("link", { name: "태그 둘러보기" })).toHaveAttribute("href", /\/tags$/);
  });

  test("no dashed card is left on the notes surfaces", async ({ page }) => {
    await page.goto("/ko/blog?q=%EC%9A%B0%EC%A3%BC%EC%84%A0&view=notes");
    await expect(empty(page)).toBeVisible({ timeout: 30_000 });
    expect(await page.locator("main .border-dashed").count()).toBe(0);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a post search with no match keeps its own search box on a phone", async ({ page }) => {
    await page.goto("/ko/blog?q=%EC%9A%B0%EC%A3%BC%EC%84%A0");
    const box = empty(page);
    await expect(box.getByRole("searchbox")).toBeVisible({ timeout: 30_000 });
    await expect(box.getByRole("searchbox")).toHaveValue("우주선");
  });
});
