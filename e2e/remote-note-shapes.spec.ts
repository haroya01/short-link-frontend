import { expect, test, type Page } from "@playwright/test";

// Mock lane: the viewer follows nora@blog.example (a blog), tomas@lemmy.example (a community poster)
// and trailcam@pt.example (videos) besides mina@mastodon.social, whose poll is counted on her server.
// haruto@misskey.io has a poll with no closing time.

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("followed posts that are more than notes arrive as cards that go to the original", async ({ page }) => {
    await page.goto("/ko/blog?sort=following");

    const article = page.locator('article[data-note-id="16"]').locator('a[data-remote-card="ARTICLE"]');
    await expect(article).toBeVisible({ timeout: 30_000 });
    await expect(article).toHaveAttribute("href", "https://blog.example/2026/10/tomato-season/");
    await expect(article).toHaveAttribute("target", "_blank");
    await expect(article).toHaveAttribute("rel", "nofollow noopener ugc");
    await expect(article).toHaveAccessibleName("토마토 한 철, 인내의 기록, 원문에서 보기 (blog.example)");
    await expect(article).toContainText("원문에서 보기·blog.example→");

    const page_ = page.locator('article[data-note-id="17"]').locator('a[data-remote-card="PAGE"]');
    await expect(page_).toContainText("gardening@lemmy.example");
    await expect(page_).toContainText("Raised beds: worth the lumber?");

    const video = page.locator('article[data-note-id="18"]');
    await expect(video.getByRole("img", { name: "영상" })).toBeVisible();
    await expect(video.locator("video")).toHaveCount(0);

    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("a tap on the card opens the original in a new tab and leaves the feed where it was", async ({ page, context }) => {
    await context.route("https://blog.example/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<title>original</title>" }),
    );
    await page.goto("/ko/blog?sort=following");
    const card = page.locator('article[data-note-id="16"]').locator("a[data-remote-card]");
    await expect(card).toBeVisible({ timeout: 30_000 });
    const opened = context.waitForEvent("page");
    await card.getByText("토마토 한 철, 인내의 기록").click();
    const tab = await opened;
    await expect(tab).toHaveURL("https://blog.example/2026/10/tomato-season/");
    await expect(page).toHaveURL(/\/blog\?sort=following$/);
  });

  test("a poll from another server shows its results and sends the vote to the original", async ({ page }) => {
    await page.goto("/ko/blog?sort=following");
    const poll = page.locator('[data-note-poll="14"]');
    await expect(poll.locator("[data-poll-result]")).toHaveCount(3, { timeout: 30_000 });
    await expect(poll.getByRole("button")).toHaveCount(0);
    await expect(poll).toContainText("27명 참여");
    const vote = poll.getByRole("link", { name: "원문에서 투표" });
    await expect(vote).toHaveAttribute("href", "https://mastodon.social/@mina/113300000000000014");
    await expect(vote).toHaveAttribute("target", "_blank");
  });

  test("a poll without a closing time stays open", async ({ page }) => {
    await page.goto("/ko/blog/remote/9801");
    const poll = page.locator('[data-note-poll="15"]');
    await expect(poll).toContainText("11명 참여", { timeout: 30_000 });
    await expect(poll).toContainText("마감 없음");
    await expect(poll).not.toContainText("마감됨");
    await expect(poll.getByRole("link", { name: "원문에서 투표" })).toHaveAttribute("href", "https://misskey.io/notes/9xk2a1b3c4");
  });

  test("the note page shows the same card with the whole summary", async ({ page }) => {
    await page.goto("/ko/blog/remote/9807/notes/17");
    const card = page.locator('a[data-remote-card="PAGE"]').first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect(card).toContainText("Curious what others used.");
    await expect(card).toHaveAttribute("href", "https://lemmy.example/post/12345");
  });

  test("a plain note from another server is drawn as before", async ({ page }) => {
    await page.goto("/ko/blog?sort=following");
    const plain = page.locator('article[data-note-id="12"]');
    await expect(plain).toContainText("Hello from the fediverse", { timeout: 30_000 });
    await expect(plain.locator("[data-remote-card]")).toHaveCount(0);
    await expect(plain.getByText("원문에서 보기")).toHaveCount(0);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the cards and the poll fit a phone", async ({ page }) => {
    await page.goto("/ko/blog?sort=following");
    await expect(page.locator('a[data-remote-card="VIDEO"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-note-poll="14"]').getByRole("link", { name: "원문에서 투표" })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});
