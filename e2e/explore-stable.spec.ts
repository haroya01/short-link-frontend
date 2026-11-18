import { expect, test, type Page, type Route } from "@playwright/test";
import { mockBackend } from "./helpers/mock-backend";
import { remoteTrendingItem } from "./helpers/remote-notes";
import { topicLink, topicTag } from "./helpers/topics";

// Mock lane (Playwright routes): 둘러보기 트렌드 waits for the topics answer before it draws anything
// under the tabs, so nothing is put above what is already on screen. The stream is asked at once.
test.use({ viewport: { width: 412, height: 823 } });

function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => (open = resolve));
  return { opened, open };
}

const TOPICS = [
  topicLink("https://saebyeok.example/a", "동네 도서관, 평일 밤 10시까지 연다", "새벽일보", { people: 31 }),
  topicTag("첫눈", { people: 24 }),
  { ...topicTag("주사위"), id: "poll:1", kind: "poll" },
  topicTag("朝の一枚", { language: "ja", own: false, people: 58 }),
  ...Array.from({ length: 9 }, (_, i) => topicTag(`tag${i}`, { language: "en", own: false, people: 20 - i })),
];
const FULL = [...TOPICS, ...Array.from({ length: 6 }, (_, i) => topicTag(`more${i}`, { language: "en", own: false }))];

type Serve = {
  topics?: (route: Route, limit: string | null, call: number) => unknown;
  stream?: Promise<void>;
};

async function serveExplore(page: Page, { topics, stream = Promise.resolve() }: Serve = {}) {
  const seen = { topics: [] as string[], languages: [] as (string | undefined)[], trending: [] as string[] };
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
    "GET /api/v1/federation/trending": async (route: Route) => {
      seen.trending.push(new URL(route.request().url()).search);
      await stream;
      await route.fulfill({ json: { items: Array.from({ length: 5 }, (_, i) => remoteTrendingItem(i)), next: null } });
    },
    "GET /api/v1/federation/topics": (route: Route) => {
      const url = new URL(route.request().url());
      seen.topics.push(url.search);
      seen.languages.push(route.request().headers()["accept-language"]);
      const limit = url.searchParams.get("limit");
      if (topics) return topics(route, limit, seen.topics.length);
      return route.fulfill({ json: { items: limit === "40" ? FULL : TOPICS } });
    },
  });
  return seen;
}

const cls = (page: Page) => page.evaluate(() => (window as unknown as { __cls: number }).__cls);

test("the lane holds its skeleton until the topics answer, then draws topics and the stream together, and nothing shifts", async ({
  page,
}) => {
  const answer = gate();
  const seen = await serveExplore(page, {
    topics: async (route) => {
      await answer.opened;
      await route.fulfill({ json: { items: TOPICS } });
    },
  });
  await page.goto("/ko/blog/explore");
  const lane = page.getByTestId("explore-trends");
  await expect(lane.getByTestId("explore-topics-skeleton")).toBeVisible();
  await expect.poll(() => seen.trending).toEqual(["?limit=20"]);
  await page.waitForTimeout(600);
  await expect(lane.getByTestId("explore-topics-skeleton")).toBeVisible();
  await expect(lane.locator("[data-remote-uri]")).toHaveCount(0);
  await expect(lane.getByRole("heading")).toHaveCount(0);
  const head = await page.locator("[data-explore-head]").boundingBox();

  answer.open();
  await expect(lane.locator("[data-topic-rank]").first()).toBeVisible();
  await expect(lane.getByTestId("explore-topics-skeleton")).toHaveCount(0);
  await expect(lane.locator("[data-remote-uri]").first()).toBeAttached();
  await expect(lane.getByRole("heading", { name: "인기 글" })).toBeVisible();
  expect(await page.locator("[data-explore-head]").boundingBox()).toEqual(head);
  await page.waitForTimeout(800);
  expect(await cls(page)).toBeLessThan(0.05);
});

test("a stream that answers after the topics fills in below them without moving them", async ({ page }) => {
  const stream = gate();
  await serveExplore(page, { stream: stream.opened });
  await page.goto("/ko/blog/explore");
  const lane = page.getByTestId("explore-trends");
  const first = lane.locator('[data-topic-rank="1"]');
  await expect(first).toBeVisible();
  await expect(lane.getByTestId("remote-feed").getByTestId("note-list-skeleton")).toBeAttached();
  const before = await first.boundingBox();
  const heading = await lane.getByRole("heading", { name: "인기 글" }).boundingBox();

  stream.open();
  await expect(lane.locator("[data-remote-uri]").first()).toBeAttached();
  expect(await first.boundingBox()).toEqual(before);
  expect(await lane.getByRole("heading", { name: "인기 글" }).boundingBox()).toEqual(heading);
  await page.waitForTimeout(500);
  expect(await cls(page)).toBeLessThan(0.05);
});

test("the server sends the search bar, lane tabs and lane skeleton, not an empty page", async ({ request }) => {
  const html = await (await request.get("/ko/blog/explore")).text();
  expect(html).toContain('role="search"');
  expect(html).toContain('id="explore-lane-trends"');
  expect(html).toContain('data-testid="explore-trends"');
  expect(html).toContain('data-testid="explore-topics-skeleton"');
});

for (const [name, status] of [
  ["does not have the endpoint yet", 404],
  ["fails", 500],
] as const) {
  test(`a server that ${name} leaves the stream alone under the tabs, with no headings and no error`, async ({ page }) => {
    const seen = await serveExplore(page, {
      topics: (route) => route.fulfill({ status, json: { status, title: "x" } }),
    });
    await page.goto("/ko/blog/explore");
    const lane = page.getByTestId("explore-trends");
    await expect(lane.locator("[data-remote-uri]")).toHaveCount(5);
    await expect(lane.getByRole("heading", { name: "인기 글" })).toHaveCount(0);
    await expect(lane.getByRole("heading", { name: "지금 도는 이야기" })).toHaveCount(0);
    await expect(page.getByTestId("explore-topics")).toHaveCount(0);
    await expect(lane.getByRole("button", { name: "다시 시도" })).toHaveCount(0);
    await expect(lane).not.toContainText("불러오지 못했어요");
    await page.waitForTimeout(500);
    expect(seen.topics).toEqual(["?limit=20"]);
    expect(await cls(page)).toBeLessThan(0.05);
  });
}

test("the page asks for topics once for the lane and the search chips, with the browser's own Accept-Language, and skips a kind it does not know", async ({
  page,
}) => {
  const seen = await serveExplore(page);
  await page.goto("/ko/blog/explore");
  const topics = page.getByTestId("explore-topics");
  const rows = topics.locator("[data-topic-rank]");
  await expect(rows).toHaveCount(10);
  await expect(topics).not.toContainText("주사위");
  expect(await rows.evaluateAll((items) => items.map((item) => item.getAttribute("data-topic-rank")))).toEqual(
    Array.from({ length: 10 }, (_, i) => String(i + 1)),
  );
  await expect(rows.nth(2)).toContainText("#朝の一枚");

  await page.getByRole("searchbox", { name: "검색" }).focus();
  await expect(page.getByTestId("explore-tag-chips").getByRole("link").first()).toHaveText("#첫눈");
  await expect(page.getByTestId("explore-tag-chips").getByRole("link").nth(1)).toHaveText("#朝の一枚");
  await page.waitForTimeout(300);
  expect(seen.topics).toEqual(["?limit=20"]);
  expect(seen.languages[0]).toMatch(/^[a-z]{2}/i);
});

test("더 보기 asks for forty and lays them out; when that fails the ten stay and the button asks again", async ({ page }) => {
  const seen = await serveExplore(page, {
    topics: (route, limit, call) => {
      if (limit !== "40") return route.fulfill({ json: { items: TOPICS } });
      if (call === 2) return route.fulfill({ status: 503, json: { status: 503, title: "Service Unavailable" } });
      return route.fulfill({ json: { items: FULL } });
    },
  });
  await page.goto("/ko/blog/explore");
  const topics = page.getByTestId("explore-topics");
  const rows = topics.locator("[data-topic-rank]");
  const more = topics.getByRole("button", { name: "더 보기" });
  await expect(rows).toHaveCount(10);

  await more.click();
  await expect.poll(() => seen.topics).toEqual(["?limit=20", "?limit=40"]);
  await expect(more).toBeEnabled();
  await expect(rows).toHaveCount(10);
  await expect(topics).not.toContainText("불러오지 못했어요");

  await more.click();
  await expect(rows).toHaveCount(18);
  await expect(more).toHaveCount(0);
  expect(seen.topics).toEqual(["?limit=20", "?limit=40", "?limit=40"]);
});

test("with ten or fewer topics there is no 더 보기", async ({ page }) => {
  await serveExplore(page, { topics: (route) => route.fulfill({ json: { items: TOPICS.slice(0, 4) } }) });
  await page.goto("/ko/blog/explore");
  const topics = page.getByTestId("explore-topics");
  await expect(topics.locator("[data-topic-rank]")).toHaveCount(3);
  await expect(topics.getByRole("button", { name: "더 보기" })).toHaveCount(0);
  await expect(topics.getByRole("heading", { name: "다른 언어" })).toHaveCount(1);
});
