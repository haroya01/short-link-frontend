import { expect, test, type Page, type Route } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";
import { remoteTrendingItem } from "./helpers/remote-notes";
import { topicLink, topicTag } from "./helpers/topics";

// Mock lane (Playwright routes): the tag page's notes view and the link page read
// /federation/topics/posts by cursor. The first answer of a topic can take seconds; the page holds
// its skeleton and nothing moves when the answer lands.
test.use({ viewport: { width: 390, height: 844 } });

const POSTS = "GET /api/v1/federation/topics/posts";
const POOLED = Array.from({ length: 5 }, (_, i) => remoteTrendingItem(i));
const LINK = "https://saebyeok.example/local/library-night?from=home&n=1";

function kept(id: number, body: string) {
  return {
    ...POOLED[0],
    id,
    body,
    likeCount: null,
    likedByMe: false,
    repostCount: null,
    author: { id: 7, username: "yuna", avatarUrl: null, displayName: null, remoteId: null },
    remote: null,
    uri: null,
    url: undefined,
    sourceHost: undefined,
    servers: undefined,
  };
}

const SNOW = topicTag("첫눈", {
  people: 24,
  related: [
    { url: "https://baramnalssi.example/a", title: "주말 중부 내륙에 첫눈 예보", source: "바람날씨", image: null },
    { url: "http://plain.example/b", title: "https 가 아닌 기사", source: "평문일보", image: null },
    { url: "https://dongnesanchaek.example/c", title: "첫눈 오는 날 걷기 좋은 길", source: null, image: null },
    { url: "https://salim.example/d", title: "눈 오는 날 장보기", source: "오늘의 살림", image: null },
    { url: "https://gilmok.example/e", title: "네 번째 기사", source: "길목", image: null },
  ],
});

function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => (open = resolve));
  return { opened, open };
}

async function serve(page: Page, posts: (route: Route, cursor: string | null, call: number) => unknown) {
  const seen = { posts: [] as string[] };
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) w.__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await mockBackend(page, {
    [POSTS]: (route: Route) => {
      const url = new URL(route.request().url());
      seen.posts.push(url.search);
      return posts(route, url.searchParams.get("cursor"), seen.posts.length);
    },
  });
  return seen;
}

const cls = (page: Page) => page.evaluate(() => (window as unknown as { __cls: number }).__cls);

async function scrollToEnd(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

const TAG_QUERY = `?tag=${encodeURIComponent("첫눈")}&limit=20`;

test("the tag page asks by tag, follows each cursor, and lists kept notes and other servers' posts as they came", async ({
  page,
}) => {
  await signIn(page);
  const seen = await serve(page, (route, cursor) => {
    if (cursor === null) return route.fulfill({ json: { topic: SNOW, items: [POOLED[0], kept(41, "첫눈 온 날의 노트 #첫눈"), POOLED[1]], next: "t3" } });
    if (cursor === "t3") return route.fulfill({ json: { topic: SNOW, items: [POOLED[2], POOLED[0]], next: "r41" } });
    return route.fulfill({ json: { topic: SNOW, items: [kept(40, "작년 첫눈 #첫눈")], next: null } });
  });
  await page.goto("/ko/blog/tags/%EC%B2%AB%EB%88%88?view=notes");
  const posts = page.getByTestId("topic-posts");
  await expect(posts.locator('article[data-note-id="41"]')).toBeVisible({ timeout: 30_000 });

  const related = page.getByTestId("related-articles").getByRole("link");
  await expect(related).toHaveText(["주말 중부 내륙에 첫눈 예보바람날씨", "첫눈 오는 날 걷기 좋은 길dongnesanchaek.example", "눈 오는 날 장보기오늘의 살림"]);

  await expect
    .poll(
      async () => {
        await scrollToEnd(page);
        return seen.posts;
      },
      { timeout: 20_000 },
    )
    .toEqual([TAG_QUERY, `${TAG_QUERY}&cursor=t3`, `${TAG_QUERY}&cursor=r41`]);
  await expect(posts.locator('article[data-note-id="40"]')).toBeVisible();
  expect(
    await posts.evaluate((list) =>
      [...list.querySelectorAll("[data-remote-uri], article[data-note-id]")]
        .filter((entry) => entry.matches("[data-remote-uri]") || !entry.closest("[data-remote-uri]"))
        .map((entry) => entry.getAttribute("data-remote-uri")?.split("/").pop() ?? `kept:${entry.getAttribute("data-note-id")}`),
    ),
  ).toEqual(["1000", "kept:41", "1001", "1002", "kept:40"]);
  await expect(posts.getByRole("button", { name: "더 보기" })).toHaveCount(0);
});

test("a first answer that takes seconds holds the skeleton, then 관련 기사 and the posts land together without a shift", async ({
  page,
}) => {
  const answer = gate();
  await serve(page, async (route) => {
    await answer.opened;
    await route.fulfill({ json: { topic: SNOW, items: POOLED, next: null } });
  });
  await page.goto("/ko/blog/tags/%EC%B2%AB%EB%88%88?view=notes");
  const skeleton = page.getByTestId("note-list-skeleton");
  await expect(skeleton).toBeVisible({ timeout: 30_000 });
  const tabs = await page.getByRole("link", { name: "노트", exact: true }).boundingBox();
  await page.waitForTimeout(1_500);
  await expect(skeleton).toBeVisible();
  await expect(page.getByTestId("related-articles")).toHaveCount(0);

  answer.open();
  await expect(page.getByTestId("related-articles")).toBeVisible();
  await expect(page.getByTestId("topic-posts").locator("[data-remote-uri]")).toHaveCount(5);
  await expect(skeleton).toHaveCount(0);
  expect(await page.getByRole("link", { name: "노트", exact: true }).boundingBox()).toEqual(tabs);
  await page.waitForTimeout(500);
  expect(await cls(page)).toBeLessThan(0.05);
});

test("a later page that fails says so under the list, and 다시 시도 asks for the same page", async ({ page }) => {
  await signIn(page);
  let failed = false;
  const seen = await serve(page, (route, cursor) => {
    if (cursor === null) return route.fulfill({ json: { topic: null, items: POOLED.slice(0, 3), next: "t3" } });
    if (!failed) {
      failed = true;
      return route.fulfill({ status: 503, json: { status: 503, title: "Service Unavailable" } });
    }
    return route.fulfill({ json: { topic: null, items: POOLED.slice(3), next: null } });
  });
  await page.goto("/ko/blog/tags/%EC%B2%AB%EB%88%88?view=notes");
  const posts = page.getByTestId("topic-posts");
  await expect(posts.locator("[data-remote-uri]")).toHaveCount(3, { timeout: 30_000 });
  await expect
    .poll(async () => {
      await scrollToEnd(page);
      return seen.posts.length;
    })
    .toBe(2);
  await expect(posts.getByText("불러오지 못했어요", { exact: true })).toBeVisible();
  await page.waitForTimeout(800);
  expect(seen.posts).toHaveLength(2);

  await posts.getByRole("button", { name: "다시 시도" }).click();
  await expect(posts.locator("[data-remote-uri]")).toHaveCount(5);
  expect(seen.posts).toEqual([TAG_QUERY, `${TAG_QUERY}&cursor=t3`, `${TAG_QUERY}&cursor=t3`]);
});

test("a first page that fails offers to try again, and an empty answer shows the page's empty line", async ({ page }) => {
  const seen = await serve(page, (route, _cursor, call) =>
    call === 1
      ? route.fulfill({ status: 503, json: { status: 503, title: "Service Unavailable" } })
      : route.fulfill({ json: { topic: null, items: [], next: null } }),
  );
  await page.goto("/ko/blog/tags/%EC%B2%AB%EB%88%88?view=notes");
  await expect(page.getByText("노트를 불러오지 못했어요")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "다시 시도" }).click();
  await expect(page.getByText("이 태그의 노트가 아직 없어요")).toBeVisible();
  expect(seen.posts).toEqual([TAG_QUERY, TAG_QUERY]);
});

test("the link page asks by the encoded address and takes its title from the topic", async ({ page }) => {
  const seen = await serve(page, (route) =>
    route.fulfill({
      json: {
        topic: topicLink(LINK, "동네 도서관, 다음 달부터 평일 밤 10시까지 연다", "새벽일보", { people: 31 }),
        items: [
          { ...POOLED[0], body: `10시까지면 얘기가 다르지.\n${LINK}`, linkPreview: { url: LINK, title: "카드 제목", description: null, image: null } },
          { ...POOLED[1], body: LINK, linkPreview: { url: LINK, title: "카드 제목", description: null, image: null } },
          {
            ...POOLED[2],
            body: "같이 볼 만한 글 https://salim.example/x",
            linkPreview: { url: "https://salim.example/x", title: "다른 링크", description: null, image: null },
          },
        ],
        next: null,
      },
    }),
  );
  await page.goto(`/ko/blog/notes/link?url=${encodeURIComponent(LINK)}`);
  const head = page.getByTestId("linked-notes-link");
  await expect(head).toContainText("동네 도서관, 다음 달부터 평일 밤 10시까지 연다", { timeout: 30_000 });
  await expect(head).toHaveAttribute("href", LINK);
  expect(seen.posts).toEqual([`?url=${encodeURIComponent(LINK)}&limit=20`]);

  const rows = page.getByTestId("topic-posts").locator("[data-remote-uri]");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0).locator("[data-note-link-card]")).toHaveCount(0);
  await expect(rows.nth(1).locator("a[data-note-link-card]")).toHaveAttribute("href", LINK);
  await expect(rows.nth(2).locator("a[data-note-link-card]")).toHaveAttribute("href", "https://salim.example/x");
});
