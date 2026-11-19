import { expect, test, type Page } from "@playwright/test";

// Mock-on lane: signed in as @dohyun. A topic row in 둘러보기 opens the tag page's notes view or the
// link page; both list notes kurl keeps and posts from other servers together, four to a page here.
// #첫눈 is a topic with related articles, #산책 a topic kurl also has a note for, #kurl no topic.
test.use({ viewport: { width: 390, height: 844 } });

const LIBRARY = "https://saebyeok.example/local/library-night";

async function openLane(page: Page) {
  await page.goto("/ko/blog/explore");
  await expect(page.getByTestId("explore-topics").locator("[data-topic-rank]").first()).toBeVisible({ timeout: 30_000 });
}

function order(page: Page) {
  return page.getByTestId("topic-posts").evaluate((list) =>
    [...list.querySelectorAll("[data-remote-uri], article[data-note-id]")]
      .filter((entry) => entry.matches("[data-remote-uri]") || !entry.closest("[data-remote-uri]"))
      .map((entry) => {
        const pooled = entry.getAttribute("data-remote-uri");
        return pooled ? `pool:${pooled.split("/").pop()}` : `kept:${entry.getAttribute("data-note-id")}`;
      }),
  );
}

async function scrollToEnd(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

test("a tag topic opens its notes with 관련 기사 above posts from other servers, and pages on", async ({ page }) => {
  await openLane(page);
  await page.getByTestId("explore-topics").getByRole("link", { name: /#첫눈/ }).click();
  await expect(page).toHaveURL(/\/tags\/%EC%B2%AB%EB%88%88\?view=notes$/);

  const related = page.getByTestId("related-articles");
  await expect(related.getByRole("heading", { name: "관련 기사" })).toBeVisible({ timeout: 30_000 });
  const articles = related.getByRole("link");
  await expect(articles).toHaveText(["주말 중부 내륙에 첫눈 예보, 쌓이는 눈은 1~3cm바람날씨", "첫눈 오는 날 걷기 좋은 길 다섯 곳동네산책"]);
  await expect(articles.first()).toHaveAttribute("href", "https://baramnalssi.example/forecast/first-snow");
  await expect(articles.first()).toHaveAttribute("target", "_blank");
  await expect(articles.first()).toHaveAttribute("rel", "noopener noreferrer nofollow");
  await expect(related.locator("svg, img")).toHaveCount(0);

  const posts = page.getByTestId("topic-posts");
  const rows = posts.locator("[data-remote-uri]");
  await expect(rows.first()).toContainText("퇴근하려고 나왔는데 눈발이 날린다");
  await expect(rows.first()).toContainText("@sora@moim.example");
  await expect(posts).not.toContainText("에서 인기");
  const box = (await related.boundingBox())!;
  expect((await rows.first().boundingBox())!.y).toBeGreaterThan(box.y + box.height - 1);

  await expect
    .poll(async () => {
      await scrollToEnd(page);
      return rows.count();
    })
    .toBe(6);
  expect(await order(page)).toEqual(["pool:7101", "pool:7102", "pool:7103", "pool:7104", "pool:7105", "pool:7106"]);
  await expect(posts.getByRole("button", { name: "더 보기" })).toHaveCount(0);
});

test("a tag kurl also has notes for lists them among other servers' posts, newest first", async ({ page }) => {
  await page.goto("/ko/blog/tags/%EC%82%B0%EC%B1%85?view=notes");
  const posts = page.getByTestId("topic-posts");
  await expect(posts.locator('article[data-note-id="5"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("related-articles")).toHaveCount(0);
  await expect(posts.locator('article[data-note-id="5"]').getByRole("button", { name: "노트 메뉴" })).toBeVisible();

  await expect
    .poll(async () => {
      await scrollToEnd(page);
      return order(page);
    })
    .toEqual(["pool:7201", "kept:5", "pool:7202", "pool:7203", "pool:7204", "pool:7205"]);
});

test("a tag that is not a topic keeps listing kurl's notes, and one with nothing says so", async ({ page }) => {
  await page.goto("/ko/blog/tags/kurl?view=notes");
  const posts = page.getByTestId("topic-posts");
  await expect(posts.locator('article[data-note-id="12"]')).toContainText("Hello from the fediverse", { timeout: 30_000 });
  await expect(posts.locator("[data-remote-uri]")).toHaveCount(0);
  await expect(page.getByTestId("related-articles")).toHaveCount(0);

  await page.goto("/ko/blog/tags/%EC%97%86%EB%8A%94%ED%83%9C%EA%B7%B8?view=notes");
  await expect(page.getByText("이 태그의 노트가 아직 없어요")).toBeVisible({ timeout: 30_000 });
});

test("a link topic opens its page, where a post that says something drops the page's own preview and a bare link keeps it", async ({
  page,
}) => {
  await openLane(page);
  await page.getByTestId("explore-topics").locator('[data-topic-rank="1"]').getByRole("link").click();
  await expect(page).toHaveURL(/\/notes\/link\?url=https%3A%2F%2Fsaebyeok\.example%2Flocal%2Flibrary-night$/);

  const head = page.getByTestId("linked-notes-link");
  await expect(head).toHaveAttribute("href", LIBRARY, { timeout: 30_000 });
  await expect(head).toContainText("동네 도서관, 다음 달부터 평일 밤 10시까지 연다");
  await expect(head).toContainText("saebyeok.example");

  const posts = page.getByTestId("topic-posts");
  const said = posts.locator("[data-remote-uri$='/7301']");
  await expect(said).toContainText("10시까지면 얘기가 다르지.");
  await expect(said.locator("[data-note-link-card]")).toHaveCount(0);
  await expect(said).not.toContainText("saebyeok.example/local");

  const bare = posts.locator("[data-remote-uri$='/7302']");
  await expect(bare.locator("a[data-note-link-card]")).toHaveAttribute("href", LIBRARY);
  await expect(bare.locator("a[data-note-link-card]")).toContainText("동네 도서관, 다음 달부터 평일 밤 10시까지 연다");
  await expect(bare.locator("[data-note-body] p")).toHaveCount(0);

  const midway = posts.locator("[data-remote-uri$='/7303']");
  await expect(midway.locator("[data-note-link-card]")).toHaveCount(0);
  await expect(midway.getByRole("link", { name: LIBRARY })).toBeVisible();

  await expect(posts.locator("[data-note-link-card]")).toHaveCount(1);
  expect(await order(page)).toEqual(["pool:7301", "pool:7302", "pool:7303", "pool:7304"]);
});

test("a link that is not a topic lists kurl's notes, titled by the note's preview, without repeating it", async ({ page }) => {
  await page.goto("/ko/blog/notes/link?url=https%3A%2F%2Fkurl.me%2Fabout");
  const head = page.getByTestId("linked-notes-link");
  await expect(head).toContainText("짧은 링크와 글이 오래 사는 곳", { timeout: 30_000 });
  const note = page.getByTestId("topic-posts").locator('article[data-note-id="3"]');
  await expect(note).toContainText("단축 링크가 사라지면 글도 같이 끊긴다");
  await expect(note.locator("[data-note-link-card]")).toHaveCount(0);
  await expect(page.getByTestId("topic-posts").locator("[data-remote-uri]")).toHaveCount(0);
});

test("a post from another server on a topic page is brought over when opened", async ({ page }) => {
  await page.goto("/ko/blog/tags/%EC%B2%AB%EB%88%88?view=notes");
  const first = page.getByTestId("topic-posts").locator("[data-remote-uri$='/7101']");
  await first.getByText("퇴근하려고 나왔는데 눈발이 날린다").click({ timeout: 30_000 });
  await expect(page).toHaveURL(/\/remote\/\d+\/notes\/\d+$/);
});
