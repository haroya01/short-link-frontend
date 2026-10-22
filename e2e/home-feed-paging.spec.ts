import { expect, test, type Page, type Route } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

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

test("홈 asks for 최신 and follows the cursor to the next page as the reader scrolls", async ({ page }) => {
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
    .toEqual(["?tab=latest&limit=20&seen=hide", "?tab=latest&limit=20&cursor=13.1&seen=hide"]);
  await expect(feed.locator('article[data-note-id="301"]')).toBeVisible();
  await page.waitForTimeout(600);
  expect(seen.home).toHaveLength(2);
});

test("each tab asks /public/home with its own tab", async ({ page }) => {
  await signIn(page);
  const seen = await serve(page);
  await page.goto("/ko/blog?sort=trending");
  await expect(page.getByTestId("home-feed").locator('article[data-note-id="101"]')).toBeVisible({ timeout: 30_000 });
  await page.goto("/ko/blog?sort=following");
  await expect(page.getByTestId("home-feed").locator('article[data-note-id="101"]')).toBeVisible({ timeout: 30_000 });
  expect(seen.home.map((q) => new URLSearchParams(q).get("tab"))).toEqual(
    expect.arrayContaining(["trending", "following"]),
  );
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
    "?tab=latest&limit=20&cursor=13.1&seen=hide",
    "?tab=latest&limit=20&cursor=13.1&seen=hide",
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
