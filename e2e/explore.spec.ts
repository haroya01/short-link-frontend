import { expect, test, type Locator, type Page } from "@playwright/test";
import { batchIntersectionReports } from "./helpers/batched-intersections";
import { scrollUntilPresent } from "./helpers/scroll-until";

// Mock-on lane: signed in as @dohyun. 둘러보기 is a search box over two lanes, 트렌드 · 사람. 트렌드 is what
// several accounts are posting about now, the reader's language first, then the endless stream of
// posts trending on other servers; recent searches and hashtags wait behind the search box.
// kurl:mock-empty=topics answers no topics, kurl:mock-fail=topics fails the request.
test.use({ viewport: { width: 390, height: 844 } });

async function open(page: Page, path = "/ko/blog/explore") {
  await page.goto(path);
  await expect(page.getByRole("searchbox", { name: "검색" })).toBeVisible({ timeout: 30_000 });
}

async function top(locator: Locator) {
  return (await locator.boundingBox())!.y;
}

const row = (page: Page, rank: number) => page.getByTestId("explore-topics").locator(`[data-topic-rank="${rank}"]`);

test("트렌드 ranks what is going around, the reader's language first and 다른 언어 after, then 인기 글 that keeps going", async ({
  page,
}) => {
  await open(page);
  await expect(page.getByRole("tab")).toHaveText(["트렌드", "사람"]);
  await expect(page.getByRole("tab", { name: "트렌드" })).toHaveAttribute("aria-selected", "true");
  const topics = page.getByTestId("explore-topics");
  await expect(topics.getByRole("heading", { name: "지금 도는 이야기" })).toBeVisible({ timeout: 30_000 });
  const rows = topics.locator("[data-topic-rank]");
  await expect(rows).toHaveCount(10);
  expect(await rows.evaluateAll((items) => items.map((item) => item.getAttribute("data-topic-rank")))).toEqual(
    Array.from({ length: 10 }, (_, i) => String(i + 1)),
  );

  await expect(row(page, 1).getByRole("link")).toHaveText(
    "1새벽일보동네 도서관, 다음 달부터 평일 밤 10시까지 연다31명이 이야기 중",
  );
  await expect(row(page, 1).getByRole("link")).toHaveAttribute(
    "href",
    /\/notes\/link\?url=https%3A%2F%2Fsaebyeok\.example%2Flocal%2Flibrary-night$/,
  );
  await expect(row(page, 2).getByRole("link")).toHaveText("2#첫눈24명이 이야기 중");
  await expect(row(page, 2).locator("[data-topic-meta]")).toHaveCount(0);
  await expect(row(page, 2).getByRole("link")).toHaveAttribute("href", /\/tags\/%EC%B2%AB%EB%88%88\?view=notes$/);
  await expect(row(page, 5).locator("[data-topic-meta]")).toHaveText("gilmok.example");
  await expect(row(page, 8).locator("[data-topic-meta]")).toHaveText("일본어");
  await expect(row(page, 8)).toContainText("#朝の一枚");
  await expect(row(page, 9).locator("[data-topic-meta]")).toHaveText("あおぞら新聞 · 일본어");
  await expect(row(page, 10).locator("[data-topic-meta]")).toHaveText("Harbor Post · 영어");
  await expect(topics).not.toContainText("뉴스");
  await expect(topics.locator("svg, img")).toHaveCount(0);

  const other = topics.getByRole("heading", { name: "다른 언어" });
  await expect(other).toHaveCount(1);
  expect(await top(other)).toBeGreaterThan(await top(row(page, 7)));
  expect(await top(other)).toBeLessThan(await top(row(page, 8)));

  const lane = page.getByTestId("explore-trends");
  const popular = lane.getByRole("heading", { name: "인기 글" });
  const remote = lane.getByTestId("remote-feed");
  await expect(remote).toHaveAttribute("data-remote-view", "trending");
  expect(await top(popular)).toBeGreaterThan(await top(row(page, 10)));
  expect(await top(remote)).toBeGreaterThan(await top(popular));
  await expect(remote.locator("[data-remote-uri]").first()).toContainText("에서 인기");
  await scrollUntilPresent(remote.locator('article[data-note-id="13"]'));
  await expect(remote.getByRole("heading", { name: "받은 노트" })).toBeVisible();
  await expect(lane.locator("[data-post-id]")).toHaveCount(0);
  await expect(page.getByTestId("explore-people-strip")).toHaveCount(0);
  await expect(page).toHaveURL(/\/explore$/);
});

test("인기 글 loads its next page when its end comes into view, even when the browser reports that in one batch with an earlier out-of-view report", async ({
  page,
}) => {
  const outOfViewHeld = await batchIntersectionReports(page, '[data-testid="remote-feed"] [role="status"]');
  await open(page);
  const remote = page.getByTestId("explore-trends").getByTestId("remote-feed");
  await expect(remote.locator("[data-remote-uri]")).toHaveCount(7, { timeout: 30_000 });
  await expect(remote.getByRole("button", { name: "더 보기" })).toBeVisible();
  await outOfViewHeld();

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(remote.locator('article[data-note-id="13"]')).toBeVisible();
  await expect(remote.getByRole("button", { name: "더 보기" })).toHaveCount(0);
});

test("더 보기 lays the longer list out in place, numbered on, and goes away", async ({ page }) => {
  await open(page);
  const topics = page.getByTestId("explore-topics");
  const rows = topics.locator("[data-topic-rank]");
  await expect(rows).toHaveCount(10, { timeout: 30_000 });
  const more = topics.getByRole("button", { name: "더 보기" });
  const fromTop = async (rank: number) => (await top(row(page, rank))) + (await page.evaluate(() => window.scrollY));
  const first = await fromTop(1);
  const tenth = await fromTop(10);
  await more.click();

  await expect(rows).toHaveCount(24);
  expect(await rows.evaluateAll((items) => items.map((item) => item.getAttribute("data-topic-rank")))).toEqual(
    Array.from({ length: 24 }, (_, i) => String(i + 1)),
  );
  await expect(more).toHaveCount(0);
  await expect(page).toHaveURL(/\/explore$/);
  expect(await fromTop(1)).toBe(first);
  expect(await fromTop(10)).toBe(tenth);
  await expect(row(page, 11).getByRole("link")).toBeFocused();
  await expect(topics.getByRole("heading", { name: "다른 언어" })).toHaveCount(1);
  await expect(row(page, 7)).toContainText("#오늘의도시락");
  await expect(row(page, 8)).toContainText("#朝の一枚");

  const unknown = rows.filter({ hasText: "#nowplaying" });
  await expect(unknown.locator("[data-topic-meta]")).toHaveCount(0);
  await expect(rows.filter({ hasText: "Die Stadtbibliothek" }).locator("[data-topic-meta]")).toHaveText("Morgenblatt · 독일어");
  await expect(rows.filter({ hasText: "古い万年筆を直して使う" }).locator("[data-topic-meta]")).toHaveText(
    "fude.example · 일본어",
  );
  await expect(page.getByTestId("explore-trends").getByRole("heading", { name: "인기 글" })).toBeVisible();
});

for (const [name, key, value] of [
  ["answers none", "kurl:mock-empty", "topics"],
  ["fails", "kurl:mock-fail", "topics"],
] as const) {
  test(`when the topics request ${name}, 트렌드 is the stream alone with no headings and no error`, async ({ page }) => {
    await page.addInitScript(([k, v]) => window.localStorage.setItem(k, v), [key, value] as const);
    await open(page);
    const lane = page.getByTestId("explore-trends");
    const remote = lane.getByTestId("remote-feed");
    await expect(remote.locator("[data-remote-uri]").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("explore-topics")).toHaveCount(0);
    await expect(lane.getByRole("heading", { name: "지금 도는 이야기" })).toHaveCount(0);
    await expect(lane.getByRole("heading", { name: "다른 언어" })).toHaveCount(0);
    await expect(lane.getByRole("heading", { name: "인기 글" })).toHaveCount(0);
    await expect(lane.getByRole("button", { name: "다시 시도" })).toHaveCount(0);
    await expect(lane.getByRole("alert")).toHaveCount(0);
    await expect(lane).not.toContainText("불러오지 못했어요");
    const head = (await page.locator("[data-explore-head]").boundingBox())!;
    const firstPost = (await remote.locator("[data-remote-uri]").first().boundingBox())!;
    expect(firstPost.y - (head.y + head.height)).toBeLessThan(40);
  });
}

test("lanes switch in place under a head that does not move, the URL keeps the lane, and the arrow keys walk both", async ({
  page,
}) => {
  await open(page);
  const head = page.locator("[data-explore-head]");
  await expect(row(page, 1)).toBeVisible({ timeout: 30_000 });
  const before = await head.boundingBox();

  await page.getByRole("tab", { name: "사람" }).click();
  await expect(page).toHaveURL(/\/explore\?lane=people$/);
  await expect(page.getByRole("tab", { name: "사람" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("follow-suggestions").getByTestId("suggestion-yuna")).toBeVisible();
  await expect(page.getByTestId("explore-trends")).toBeHidden();
  expect(await head.boundingBox()).toEqual(before);

  await page.getByRole("tab", { name: "트렌드" }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(row(page, 1)).toBeVisible({ timeout: 1_000 });

  await page.getByRole("tab", { name: "트렌드" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "사람" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "사람" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "트렌드" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "트렌드" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "사람" })).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\/explore\?lane=people$/);

  await open(page, "/ko/blog/explore?lane=people");
  await expect(page.getByRole("tab", { name: "사람" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("explore-trends")).toHaveCount(0);
});

for (const old of ["remote", "picks"]) {
  test(`an old ?lane=${old} link opens 트렌드 and the address drops the lane`, async ({ page }) => {
    await open(page, `/ko/blog/explore?lane=${old}`);
    await expect(page.getByRole("tab", { name: "트렌드" })).toHaveAttribute("aria-selected", "true");
    await expect(row(page, 1)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("explore-trends").getByTestId("remote-feed")).toHaveAttribute(
      "data-remote-view",
      "trending",
    );
    await expect(page).toHaveURL(/\/explore$/);
    await expect(page.locator("[data-explore-lane]")).toHaveCount(1);
  });
}

for (const [locale, copy] of [
  [
    "ja",
    {
      tabs: ["トレンド", "ユーザー"],
      now: "いま話題",
      other: "ほかの言語",
      popular: "人気の投稿",
      first: "1#朝の一枚58人が話題にしています",
      foreign: "Harbor Post · 英語",
      more: "もっと見る",
    },
  ],
  [
    "en",
    {
      tabs: ["Trends", "People"],
      now: "Trending now",
      other: "Other languages",
      popular: "Popular posts",
      first: "1Harbor PostCity library will stay open until midnight during exam weeks36 people talking",
      foreign: "Japanese",
      more: "Load more",
    },
  ],
] as const) {
  test(`${locale}: 트렌드 reads in the reader's language, with that language's topics first`, async ({ page }) => {
    await page.goto(`/${locale}/blog/explore`);
    await expect(page.getByRole("tab")).toHaveText([...copy.tabs], { timeout: 30_000 });
    const topics = page.getByTestId("explore-topics");
    await expect(topics.getByRole("heading", { name: copy.now })).toBeVisible({ timeout: 30_000 });
    await expect(topics.getByRole("heading", { name: copy.other })).toBeVisible();
    await expect(page.getByTestId("explore-trends").getByRole("heading", { name: copy.popular })).toBeVisible();
    await expect(row(page, 1).getByRole("link")).toHaveText(copy.first);
    await expect(row(page, 8).locator("[data-topic-meta]")).toHaveText(copy.foreign);
    await expect(topics.getByRole("button", { name: copy.more })).toBeVisible();
    for (let rank = 1; rank <= 10; rank++) {
      const box = (await row(page, rank).boundingBox())!;
      expect(box.x + box.width, `row ${rank}`).toBeLessThanOrEqual(390);
    }
  });
}

test("typing hides the lanes for the results, and Enter opens the full results", async ({ page }) => {
  await open(page);
  const field = page.getByRole("searchbox", { name: "검색" });
  await field.fill("kurl");
  await expect(page.getByRole("button", { name: "‘kurl’ 검색 결과" })).toBeVisible();
  await expect(page.getByRole("tablist")).toBeHidden();
  await expect(page.getByTestId("explore-trends")).toBeHidden();

  await field.fill("");
  await expect(page.getByRole("tablist")).toBeVisible();
  await field.fill("kurl");
  await field.press("Enter");
  await expect(page).toHaveURL(/[?&]q=kurl/);
});

test("recent searches and hashtags show only while the search box has focus", async ({ page }) => {
  await open(page);
  for (const q of ["산책", "kurl", "산책"]) {
    await page.getByRole("searchbox", { name: "검색" }).fill(q);
    await page.getByRole("searchbox", { name: "검색" }).press("Enter");
    await expect(page).toHaveURL(new RegExp(`[?&]q=${encodeURIComponent(q)}`));
    await open(page);
  }

  const recents = page.getByTestId("recent-searches");
  const tags = page.getByTestId("explore-tag-chips");
  await expect(recents).toBeHidden();
  await expect(tags).toBeHidden();

  const field = page.getByRole("searchbox", { name: "검색" });
  await field.focus();
  await expect(recents.getByRole("heading", { name: "최근 검색" })).toBeVisible();
  await expect(recents.getByRole("link")).toHaveText(["산책", "kurl"]);
  expect((await tags.getByRole("link").allTextContents()).slice(0, 5)).toEqual([
    "#첫눈",
    "#산책",
    "#오늘의도시락",
    "#朝の一枚",
    "#caturday",
  ]);
  await expect(tags.getByRole("link", { name: "#첫눈" })).toHaveAttribute("href", /\/tags\/%EC%B2%AB%EB%88%88\?view=notes$/);
  await expect(tags.getByRole("link", { name: "#개발" })).toHaveAttribute("href", /\/tags\/%EA%B0%9C%EB%B0%9C$/);
  await expect(tags.getByRole("link", { name: "#산책" })).toHaveCount(1);
  await expect
    .poll(async () => {
      const chips = (await tags.boundingBox())!;
      return (await top(page.getByRole("tablist"))) - (chips.y + chips.height);
    })
    .toBeGreaterThan(0);

  await recents.getByRole("button", { name: "kurl 지우기" }).click();
  await expect(recents.getByRole("link")).toHaveText(["산책"]);
  await expect(field).toBeFocused();

  await page.getByRole("tab", { name: "사람" }).click();
  await expect(recents).toBeHidden();

  await field.focus();
  await recents.getByRole("link", { name: "산책" }).click();
  await expect(page).toHaveURL(/[?&]q=%EC%82%B0%EC%B1%85/);
  await open(page);
  await field.focus();
  await page.getByRole("button", { name: "최근 검색 지우기" }).click();
  await expect(page.getByTestId("recent-searches")).toHaveCount(0);
  await page.reload();
  await expect(field).toBeVisible({ timeout: 30_000 });
  await field.focus();
  await expect(page.getByTestId("recent-searches")).toHaveCount(0);
});

test("the notifications 멘션 tab starts with a row to 개인 멘션; 전체 does not", async ({ page }) => {
  await page.goto("/ko/blog/notifications");
  await expect(page.getByTestId("notification-tab-all")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("direct-mentions-entry")).toHaveCount(0);

  await page.getByTestId("notification-tab-mentions").click();
  const row = page.getByTestId("direct-mentions-entry");
  await expect(row).toHaveText("개인 멘션");
  const rowBox = (await row.boundingBox())!;
  const tabsBox = (await page.getByRole("tablist").boundingBox())!;
  expect(rowBox.y).toBeGreaterThan(tabsBox.y);

  await row.click();
  await expect(page).toHaveURL(/\/notes\?feed=direct$/);
});
