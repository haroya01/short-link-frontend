import { expect, test, type Page, type Route } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";
import { expectOnTop, toastBy } from "./helpers/on-top";

// Mock lane (Playwright routes): 홈 asks /public/home with the tab and follows the opaque `next` cursor
// one page at a time; a post row likes the post itself.
test.use({ viewport: { width: 390, height: 844 } });

const NOW = "2026-10-20T09:00:00Z";

function note(id: number, body: string) {
  return {
    id,
    body,
    createdAt: NOW,
    editedAt: null,
    likeCount: 0,
    likedByMe: false,
    author: { id: 7, username: "yuna", avatarUrl: null, displayName: null, remoteId: null },
    media: [],
    quotedPost: null,
    inReplyToId: null,
    replyCount: 0,
    repostCount: 0,
    repostedByMe: false,
    quotedNote: null,
    linkPreview: null,
    visibility: "public",
  };
}

function post(id: number, title: string) {
  return {
    id,
    author: { id: 3, username: "minji", bio: null, avatarUrl: null, displayName: "민지" },
    slug: `post-${id}`,
    title,
    excerpt: "요약 한 줄",
    ogImageUrl: null,
    thumbnailUrl: null,
    languageTag: "ko",
    tags: [],
    publishedAt: NOW,
    viewCount: 0,
    likeCount: 4,
    readMinutes: 3,
    commentCount: 2,
    likedByMe: false,
  };
}

const PAGES: Record<string, { items: unknown[]; next: string | null }> = {
  first: {
    items: [
      { kind: "note", note: note(101, "첫 쪽 노트") },
      { kind: "post", post: post(201, "첫 쪽 글") },
      ...Array.from({ length: 12 }, (_, i) => ({ kind: "note", note: note(110 + i, `채우는 노트 ${i}`) })),
    ],
    next: "13.1",
  },
  "13.1": { items: [{ kind: "note", note: note(301, "둘째 쪽 노트") }], next: null },
};

async function serve(page: Page, home?: (route: Route, cursor: string | null) => Promise<void>) {
  const seen = { home: [] as string[], liked: [] as string[] };
  await mockBackend(page, {
    "GET /api/v1/public/home": async (route) => {
      const url = new URL(route.request().url());
      seen.home.push(url.search);
      const cursor = url.searchParams.get("cursor");
      if (home) return home(route, cursor);
      return route.fulfill({ json: PAGES[cursor ?? "first"] });
    },
    "PUT /api/v1/posts/201/like": (route) => {
      seen.liked.push("PUT");
      return route.fulfill({ json: { liked: true, likeCount: 5 } });
    },
  });
  return seen;
}

async function scrollToEnd(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

test("홈 asks for 추천 and follows the cursor to the next page as the reader scrolls", async ({ page }) => {
  await signIn(page);
  const seen = await serve(page);
  await page.goto("/ko/blog");
  const feed = page.getByTestId("home-feed");
  await expect(feed.locator('article[data-note-id="101"]')).toBeVisible({ timeout: 30_000 });
  await expect(feed.locator('[data-post-id="201"]')).toContainText("첫 쪽 글");
  await expect(feed.locator('[data-post-id="201"]')).toContainText("3분 읽기");

  await expect
    .poll(
      async () => {
        await scrollToEnd(page);
        return seen.home;
      },
      { timeout: 20_000 },
    )
    .toEqual(["?tab=for-you&limit=20&seen=hide", "?tab=for-you&limit=20&cursor=13.1&seen=hide"]);
  await expect(feed.locator('article[data-note-id="301"]')).toBeVisible();
  await page.waitForTimeout(600);
  expect(seen.home).toHaveLength(2);
});

test("each tab asks /public/home with its own tab, and an old 최신 or 인기 link opens 추천", async ({ page }) => {
  await signIn(page);
  const seen = await serve(page);
  for (const sort of ["recent", "trending", "following", "blog", "posts"]) {
    await page.goto(`/ko/blog?sort=${sort}`);
    await expect(page.getByTestId("home-feed").locator('[data-post-id="201"]')).toBeVisible({ timeout: 30_000 });
  }
  expect([...new Set(seen.home.map((q) => new URLSearchParams(q).get("tab")))].sort()).toEqual(["blog", "following", "for-you"]);
});

test("홈 has three tabs, 추천 · 팔로잉 · 블로그, opens on 추천, and keeps only 시리즈 in 더 보기", async ({ page }) => {
  await signIn(page);
  await serve(page);
  await page.goto("/ko/blog");
  await expect(page.getByTestId("home-feed").locator('article[data-note-id="101"]')).toBeVisible({ timeout: 30_000 });
  const tabs = page.locator("[data-feed-switcher] nav a");
  await expect(tabs).toHaveText(["추천", "팔로잉", "블로그"]);
  await expect(tabs.first()).toHaveAttribute("aria-current", "page");
  await page.locator("[data-feed-more] button").click();
  await expect(page.getByRole("menuitem")).toHaveText(["시리즈"]);
});

test("a post row's heart likes the post", async ({ page }) => {
  await signIn(page);
  const seen = await serve(page);
  await page.goto("/ko/blog");
  const row = page.locator('[data-post-id="201"]');
  await row.getByRole("button", { name: "좋아요", exact: true }).click({ timeout: 30_000 });
  await expect(row.getByRole("button", { name: "좋아요 취소" })).toHaveText("5");
  expect(seen.liked).toEqual(["PUT"]);
});

test("a later page that fails says so under the list, and 다시 시도 asks the same cursor", async ({ page }) => {
  await signIn(page);
  let failed = false;
  const seen = await serve(page, async (route, cursor) => {
    if (cursor && !failed) {
      failed = true;
      return route.fulfill({ status: 503, json: { status: 503, title: "Service Unavailable" } });
    }
    return route.fulfill({ json: PAGES[cursor ?? "first"] });
  });
  await page.goto("/ko/blog");
  await expect(page.locator('article[data-note-id="101"]')).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(
      async () => {
        await scrollToEnd(page);
        return seen.home.length;
      },
      { timeout: 20_000 },
    )
    .toBe(2);
  await expect(page.getByText("불러오지 못했어요", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "다시 시도" }).click();
  await expect(page.locator('article[data-note-id="301"]')).toBeVisible();
  expect(seen.home.slice(1)).toEqual([
    "?tab=for-you&limit=20&cursor=13.1&seen=hide",
    "?tab=for-you&limit=20&cursor=13.1&seen=hide",
  ]);
});

test("signed out, 팔로잉 asks to sign in and never asks /public/home for it", async ({ page }) => {
  const seen = await serve(page);
  await page.goto("/ko/blog?sort=following");
  await expect(page.getByRole("heading", { name: "팔로우한 작가의 글을 보려면 로그인하세요" })).toBeVisible({
    timeout: 30_000,
  });
  expect(seen.home.filter((q) => q.includes("tab=following"))).toEqual([]);
});

test("블로그 lists kurl blog posts newest first, reports nothing as seen, and a refresh lays only newer posts on top", async ({
  page,
}) => {
  await signIn(page);
  let refreshes = 0;
  const seenPosts: unknown[] = [];
  await mockBackend(page, {
    "GET /api/v1/public/home": (route) => {
      const url = new URL(route.request().url());
      seenPosts.push(url.search);
      if (url.searchParams.get("since") === "0.202") {
        refreshes += 1;
        if (refreshes === 2) return route.fulfill({ status: 503, json: { status: 503, title: "Service Unavailable" } });
        return route.fulfill({ json: { items: [{ kind: "post", post: post(203, "막 올린 글") }], next: null, newest: "0.203", gap: false } });
      }
      if (url.searchParams.get("since") === "0.203") {
        refreshes += 1;
        return route.fulfill({ status: 503, json: { status: 503, title: "Service Unavailable" } });
      }
      return route.fulfill({
        json: { items: [{ kind: "post", post: post(202, "둘째 글") }, { kind: "post", post: post(201, "첫 글") }], next: null, newest: "0.202" },
      });
    },
    "POST /api/v1/federation/seen": (route) => {
      seenPosts.push("seen");
      return route.fulfill({ status: 202, body: "" });
    },
  });
  await page.goto("/ko/blog?sort=blog");
  const feed = page.getByTestId("home-feed");
  await expect(feed.locator("[data-post-id]")).toHaveCount(2, { timeout: 30_000 });
  await expect(page.locator('[data-feed-switcher] nav a[aria-current="page"]')).toHaveText("블로그");
  await expect(feed.locator("[data-home-seen]")).toHaveCount(0);
  const first = new URLSearchParams(seenPosts[0] as string);
  expect([first.get("tab"), first.get("seen")]).toEqual(["blog", null]);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("kurl:home-refresh")));
  await expect(feed.locator("[data-post-id]")).toHaveCount(3);
  await expect(feed.locator("[data-post-id]").first()).toHaveAttribute("data-post-id", "203");

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("kurl:home-refresh")));
  await expectOnTop(toastBy(page, "새로고침하지 못했어요"));
  await expect(feed.locator("[data-post-id]")).toHaveCount(3);
  expect(seenPosts).not.toContain("seen");
});

test("블로그 with no posts says so in one line", async ({ page }) => {
  await signIn(page);
  await serve(page, (route) => route.fulfill({ json: { items: [], next: null } }));
  await page.goto("/ko/blog?sort=blog");
  const empty = page.getByTestId("blog-empty");
  await expect(empty.getByRole("heading", { name: "아직 발행된 글이 없어요" })).toBeVisible({ timeout: 30_000 });
  await expect(empty.locator("p")).toHaveCount(0);
});
