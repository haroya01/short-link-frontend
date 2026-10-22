import { expect, test, type Page, type Route } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

// Mock lane (Playwright routes): 홈 최신 asks the server to leave out what the reader has already
// seen (seen=hide on every page, since and the mixed 맞춤, with the device when signed out); 둘러보기 맞춤
// does not. In 홈 a row counts as seen the moment any of it shows, kurl rows by kurl:note:/kurl:post:
// keys, and a refresh first waits for what is pending to be answered. When both lists end, 홈 says
// 다 봤어요 with a way to 팔로잉.
test.use({ viewport: { width: 390, height: 844 } });

const NOW = "2026-10-23T09:00:00Z";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

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

const uri = (n: number) => `https://qdon.space/users/user${n}/statuses/${n}`;

function pooled(n: number) {
  return {
    ...note(0, `다른 서버 글 ${n}번`),
    id: null,
    likeCount: 3,
    likedByMe: null,
    author: { id: null, username: `user${n}@qdon.space`, avatarUrl: null, displayName: `작성자 ${n}`, remoteId: null },
    uri: uri(n),
    url: `https://qdon.space/@user${n}/${n}`,
    sourceHost: "qdon.space",
    servers: ["qdon.space"],
  };
}

type Body = { items: unknown[]; next: string | null };
const MINE: Body = {
  items: [
    { kind: "note", note: note(101, "kurl 노트 1") },
    { kind: "post", post: post(201, "kurl 글") },
    { kind: "note", note: note(102, "kurl 노트 2") },
  ],
  next: null,
};

async function serve(page: Page, { home = MINE, forYou = { items: [pooled(1)], next: null } as Body, slowSeen = 0 } = {}) {
  const asked = {
    home: [] as { search: string; device: string | null }[],
    forYou: [] as { search: string; device: string | null }[],
    seen: [] as string[][],
    order: [] as string[],
  };
  await mockBackend(page, {
    "GET /api/v1/public/home": (route: Route) => {
      const url = new URL(route.request().url());
      asked.home.push({ search: url.search, device: route.request().headers()["x-kurl-device"] ?? null });
      if (url.searchParams.has("since")) {
        asked.order.push("since");
        return route.fulfill({ json: { items: [], next: null, gap: false, newest: "102.201" } });
      }
      return route.fulfill({ json: { ...home, newest: "102.201" } });
    },
    "GET /api/v1/federation/for-you": (route: Route) => {
      const url = new URL(route.request().url());
      asked.forYou.push({ search: url.search, device: route.request().headers()["x-kurl-device"] ?? null });
      return route.fulfill({ json: forYou });
    },
    "POST /api/v1/federation/seen": async (route: Route) => {
      asked.seen.push(route.request().postDataJSON().uris);
      if (slowSeen) await new Promise((done) => setTimeout(done, slowSeen));
      asked.order.push("seen");
      return route.fulfill({ status: 202, body: "" });
    },
  });
  return asked;
}

test("홈 최신 asks every list with seen=hide and the device, and 둘러보기 맞춤 asks without it", async ({ page }) => {
  const asked = await serve(page);
  await page.addInitScript(() => window.localStorage.setItem("kurl:cookie-consent:v1", "accepted"));
  await page.goto("/ko/blog");
  const feed = page.getByTestId("home-feed");
  await expect(feed.locator('article[data-note-id="101"]')).toBeVisible({ timeout: 30_000 });
  await expect(feed.locator(`[data-remote-uri="${uri(1)}"]`)).toBeAttached();

  const latest = asked.home.filter((sent) => sent.search.includes("tab=latest"));
  expect(latest.length).toBeGreaterThan(0);
  expect(latest.every((sent) => new URLSearchParams(sent.search).get("seen") === "hide")).toBe(true);
  expect(latest.every((sent) => UUID.test(sent.device ?? ""))).toBe(true);
  expect(asked.forYou.every((sent) => new URLSearchParams(sent.search).get("seen") === "hide")).toBe(true);
  expect(asked.forYou[0].device).toBe(latest[0].device);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("kurl:home-refresh")));
  await expect.poll(() => asked.home.some((sent) => sent.search.includes("since="))).toBe(true);
  const since = asked.home.find((sent) => sent.search.includes("since="))!;
  expect(new URLSearchParams(since.search).get("seen")).toBe("hide");
  expect(asked.forYou.at(-1)!.search).toContain("seen=hide");

  const before = asked.forYou.length;
  await page.goto("/ko/blog/explore?lane=remote");
  await expect(page.locator(`[data-explore-lane="remote"] [data-remote-uri="${uri(1)}"]`)).toBeVisible({
    timeout: 30_000,
  });
  expect(asked.forYou.slice(before).map((sent) => new URLSearchParams(sent.search).get("seen"))).toEqual([null]);
});

test("a row counts the moment it shows, kurl rows by their key, and a refresh waits for that to be answered first", async ({
  page,
}) => {
  await signIn(page);
  const asked = await serve(page, { slowSeen: 800 });
  await page.goto("/ko/blog");
  const feed = page.getByTestId("home-feed");
  await expect(feed.locator(`[data-remote-uri="${uri(1)}"]`)).toBeAttached({ timeout: 30_000 });
  await expect(feed.locator('[data-home-seen="kurl:post:201"]')).toBeAttached();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  expect(asked.seen).toEqual([]);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("kurl:home-refresh")));
  await expect.poll(() => asked.order).toEqual(["seen", "since"]);
  expect(asked.seen[0]).toEqual(expect.arrayContaining(["kurl:note:101", "kurl:post:201", "kurl:note:102", uri(1)]));
  await expect(feed.locator('article[data-note-id="101"]')).toBeVisible();
});

test("when both lists end, 홈 says 다 봤어요 with a way to 팔로잉, under the rows or on its own", async ({ page }) => {
  await signIn(page);
  await serve(page);
  await page.goto("/ko/blog");
  const feed = page.getByTestId("home-feed");
  await expect(feed.locator(`[data-remote-uri="${uri(1)}"]`)).toBeAttached({ timeout: 30_000 });
  const done = page.getByTestId("home-caught-up");
  await expect(done.getByRole("heading", { name: "다 봤어요" })).toBeVisible();
  await expect(done.getByRole("link", { name: "팔로잉" })).toHaveAttribute("href", /sort=following/);
  const last = (await feed.locator(`[data-remote-uri="${uri(1)}"]`).boundingBox())!;
  expect((await done.boundingBox())!.y).toBeGreaterThan(last.y);

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await serve(page, { home: { items: [], next: null }, forYou: { items: [], next: null } });
  await page.reload();
  await expect(page.getByTestId("home-caught-up").getByRole("heading", { name: "다 봤어요" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("아직 발행된 글이 없어요")).toHaveCount(0);
});

test("팔로잉 and 인기 do not hide and do not count rows", async ({ page }) => {
  await signIn(page);
  const asked = await serve(page);
  for (const sort of ["trending", "following"]) {
    await page.goto(`/ko/blog?sort=${sort}`);
    await expect(page.locator('article[data-note-id="101"]')).toBeVisible({ timeout: 30_000 });
  }
  await expect(page.locator("[data-home-seen]")).toHaveCount(0);
  expect(asked.home.some((sent) => sent.search.includes("seen="))).toBe(false);
  await expect(page.getByTestId("home-caught-up")).toHaveCount(0);
});
