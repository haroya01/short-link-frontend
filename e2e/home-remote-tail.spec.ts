import { expect, test, type Page, type Route } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

// Mock lane (Playwright routes): when 홈 최신 has no next page, the latest from other servers follows
// under its label and keeps paging. Each item is read by its shape (an id is a kept note, no id is
// still in the pool), the cursor goes back as it came, and a refresh keeps the tail and asks it again.
test.use({ viewport: { width: 390, height: 844 } });

const NOW = "2026-10-22T09:00:00Z";

function note(id: number, body: string, remote = false) {
  return {
    id,
    body,
    createdAt: NOW,
    editedAt: null,
    likeCount: 0,
    likedByMe: false,
    author: remote
      ? { id: -9800, username: "mina@mastodon.social", avatarUrl: null, displayName: "Mina", remoteId: 9800 }
      : { id: 7, username: "yuna", avatarUrl: null, displayName: null, remoteId: null },
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

function pooled(n: number) {
  const host = "qdon.space";
  return {
    ...note(0, `풀에서 온 글 ${n}`),
    id: null,
    likeCount: 3,
    likedByMe: null,
    author: { id: null, username: `user${n}@${host}`, avatarUrl: null, displayName: `작성자 ${n}`, remoteId: null },
    uri: `https://${host}/users/user${n}/statuses/${n}`,
    url: `https://${host}/@user${n}/${n}`,
    sourceHost: host,
    servers: [host],
  };
}

const HOME = {
  items: Array.from({ length: 12 }, (_, i) => ({ kind: "note", note: note(101 + i, `kurl 노트 ${i}`) })),
  next: null,
};
const LATEST: Record<string, { items: unknown[]; next: string | null }> = {
  first: { items: [note(31, "저장된 노트 31", true), pooled(1), note(30, "저장된 노트 30", true)], next: "r30" },
  r30: { items: [note(29, "저장된 노트 29", true)], next: null },
};

type Options = {
  home?: { items: unknown[]; next: string | null };
  latest?: (route: Route, cursor: string | null) => Promise<void>;
};

async function serve(page: Page, { home = HOME, latest }: Options = {}) {
  const seen = { home: [] as string[], latest: [] as string[] };
  await mockBackend(page, {
    "GET /api/v1/public/home": (route) => {
      const url = new URL(route.request().url());
      seen.home.push(url.search);
      if (url.searchParams.has("since")) return route.fulfill({ json: { items: [], next: null, gap: false } });
      return route.fulfill({ json: { ...home, newest: "101" } });
    },
    "GET /api/v1/federation/latest": (route) => {
      const cursor = new URL(route.request().url()).searchParams.get("cursor");
      seen.latest.push(cursor ?? "");
      if (latest) return latest(route, cursor);
      return route.fulfill({ json: LATEST[cursor ?? "first"] });
    },
  });
  return seen;
}

async function scrollToEnd(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

test("under the last kurl row, 다른 서버 최신 follows with kept notes and pool items in order, and pages on", async ({
  page,
}) => {
  await signIn(page);
  const seen = await serve(page);
  await page.goto("/ko/blog");
  const feed = page.getByTestId("home-feed");
  await expect(feed.locator('article[data-note-id="101"]')).toBeVisible({ timeout: 30_000 });

  const tail = feed.getByTestId("home-remote-tail");
  await expect(tail.getByRole("heading", { name: "다른 서버 최신" })).toBeVisible();
  const heading = (await tail.getByRole("heading").boundingBox())!;
  const last = (await feed.locator('article[data-note-id="112"]').boundingBox())!;
  expect(heading.y).toBeGreaterThan(last.y + last.height - 1);
  await expect(tail.locator("[data-remote-kept], [data-remote-uri]").first()).toHaveAttribute("data-remote-kept", "31");
  await expect(tail.locator("[data-remote-kept], [data-remote-uri]").nth(1)).toHaveAttribute(
    "data-remote-uri",
    "https://qdon.space/users/user1/statuses/1",
  );
  await expect(tail.getByRole("heading", { name: "받은 노트" })).toHaveCount(0);

  await expect
    .poll(
      async () => {
        await scrollToEnd(page);
        return seen.latest;
      },
      { timeout: 20_000 },
    )
    .toEqual(["", "r30"]);
  await expect(tail.locator('[data-remote-kept="29"]')).toBeVisible();
});

test("a since refresh keeps the tail and asks it again from its first page", async ({ page }) => {
  await signIn(page);
  const seen = await serve(page);
  await page.goto("/ko/blog");
  const tail = page.getByTestId("home-remote-tail");
  await expect
    .poll(
      async () => {
        await scrollToEnd(page);
        return tail.locator('[data-remote-kept="29"]').count();
      },
      { timeout: 30_000 },
    )
    .toBe(1);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("kurl:home-refresh")));
  await expect.poll(() => seen.home.some((q) => q.includes("since=101"))).toBe(true);
  await expect.poll(() => seen.latest).toEqual(["", "r30", ""]);
  await expect(tail.getByRole("heading", { name: "다른 서버 최신" })).toBeAttached();
  await expect(tail.locator("[data-remote-kept], [data-remote-uri]")).toHaveCount(3);
});

test("with no kurl rows the tail starts at once, and when the tail is empty too the feed says it is empty", async ({
  page,
}) => {
  await signIn(page);
  await serve(page, { home: { items: [], next: null } });
  await page.goto("/ko/blog");
  const tail = page.getByTestId("home-remote-tail");
  await expect(tail.getByRole("heading", { name: "다른 서버 최신" })).toBeVisible({ timeout: 30_000 });
  await expect(tail.locator('[data-remote-kept="31"]')).toBeVisible();

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await serve(page, { home: { items: [], next: null }, latest: (route) => route.fulfill({ json: { items: [], next: null } }) });
  await page.reload();
  await expect(page.getByText("아직 발행된 글이 없어요")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "다른 서버 최신" })).toHaveCount(0);
});

test("a tail that fails ends the feed quietly, and 인기 never grows a tail", async ({ page }) => {
  await signIn(page);
  const seen = await serve(page, {
    latest: (route) => route.fulfill({ status: 503, json: { status: 503, title: "Service Unavailable" } }),
  });
  await page.goto("/ko/blog");
  await expect(page.locator('article[data-note-id="101"]')).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => seen.latest.length).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { name: "다른 서버 최신" })).toHaveCount(0);
  await expect(page.getByText("최신 글을 불러오지 못했어요")).toHaveCount(0);

  await page.goto("/ko/blog?sort=trending");
  await expect(page.locator('article[data-note-id="101"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("home-remote-tail")).toHaveCount(0);
});
