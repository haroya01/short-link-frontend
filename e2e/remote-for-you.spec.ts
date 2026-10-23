import { expect, test, type Page, type Route } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

// Mock lane (Playwright routes): 둘러보기 다른 서버 is 맞춤 only, from /federation/for-you. A for-you page
// can repeat a post from the page before; it is drawn once. What stayed on screen goes to
// /federation/seen with feed for-you and how long it stayed at least half on screen. 홈 추천 is one list
// the server ranks (tab=for-you); other servers' posts in it are marked 다른 서버.
test.use({ viewport: { width: 390, height: 844 } });

const NOW = "2026-10-22T09:00:00Z";
const CURSOR = "f1792656810855.12";

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

const uri = (n: number) => `https://qdon.space/users/user${n}/statuses/${n}`;

function pooled(n: number) {
  return {
    ...note(0, `다른 서버 글 ${n}번, 오늘 본 것들을 적어 둔다.`),
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

function kept(id: number) {
  return {
    ...note(id, `저장된 노트 ${id}`),
    author: { id: -9800, username: "mina@mastodon.social", avatarUrl: null, displayName: "Mina", remoteId: 9800 },
    uri: `https://mastodon.social/users/mina/statuses/${id}`,
  };
}

type Body = { items: unknown[]; next: string | null; seenFrom?: number };
type Seen = { feed?: string; uris: string[]; dwell?: { uri: string; ms: number }[] };

const EXPLORE: Record<string, Body> = {
  first: { items: Array.from({ length: 12 }, (_, i) => pooled(i + 1)), next: CURSOR },
  [CURSOR]: { items: [pooled(12), pooled(13), kept(31), pooled(14)], next: null, seenFrom: 2 },
};

const MINE = Array.from({ length: 12 }, (_, i) => ({ kind: "note", note: note(101 + i, `kurl 노트 ${i + 1}`) }));

type Options = { forYou?: Record<string, Body> | null; again?: Body; home?: Body; since?: unknown[] };

async function serve(page: Page, { forYou = EXPLORE, again, home = { items: [], next: null }, since = [] }: Options = {}) {
  const asked = { forYou: [] as string[], home: [] as string[], devices: [] as (string | null)[], seen: [] as Seen[] };
  await mockBackend(page, {
    "GET /api/v1/federation/for-you": (route: Route) => {
      const cursor = new URL(route.request().url()).searchParams.get("cursor");
      asked.forYou.push(cursor ?? "");
      asked.devices.push(route.request().headers()["x-kurl-device"] ?? null);
      if (!forYou) return route.fulfill({ status: 503, json: { status: 503, title: "Service Unavailable" } });
      const repeat = cursor === null && again && asked.forYou.filter((sent) => sent === "").length > 1;
      return route.fulfill({ json: repeat ? again : forYou[cursor ?? "first"] });
    },
    "POST /api/v1/federation/seen": (route: Route) => {
      asked.seen.push(route.request().postDataJSON());
      return route.fulfill({ status: 202, body: "" });
    },
    "GET /api/v1/public/home": (route: Route) => {
      const url = new URL(route.request().url());
      asked.home.push(url.search);
      if (url.searchParams.has("since")) {
        const items = asked.home.filter((sent) => sent.includes("since=")).length === 1 ? since : [];
        return route.fulfill({ json: { items, next: null, gap: false, newest: "150" } });
      }
      return route.fulfill({ json: { ...home, ...(url.searchParams.get("tab") === "following" ? { newest: "101" } : {}) } });
    },
  });
  return asked;
}

async function hideTab(page: Page) {
  await page.evaluate(() => {
    const set = (value: string) => {
      Object.defineProperty(document, "visibilityState", { value, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    };
    set("hidden");
    set("visible");
  });
}

async function scrollToEnd(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

function homeOrder(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("[data-testid=home-feed] :is([data-remote-uri], [data-remote-kept], article[data-note-id])")]
      .filter((el) => el.matches("[data-remote-kept]") || !el.closest("[data-remote-kept]"))
      .map((el) => {
        const pooled = el.getAttribute("data-remote-uri");
        if (pooled) return `R${pooled.split("/").pop()}`;
        const kept = el.getAttribute("data-remote-kept");
        return kept ? `K${kept}` : el.getAttribute("data-note-id");
      }),
  );
}

test("둘러보기 다른 서버 is 맞춤 only, over two pages, and sends the time read with feed for-you", async ({ page }) => {
  const asked = await serve(page);
  await page.addInitScript(() => window.localStorage.setItem("kurl:cookie-consent:v1", "accepted"));
  await page.goto("/ko/blog/explore?lane=remote");
  const feed = page.locator('[data-explore-lane="remote"] [data-testid="remote-feed"]');
  await expect(feed.locator(`[data-remote-uri="${uri(1)}"]`)).toBeVisible({ timeout: 30_000 });
  await expect(feed).toHaveAttribute("data-remote-view", "for-you");
  await expect(feed.getByRole("button", { name: "최신" })).toHaveCount(0);
  await expect(feed.locator("[data-remote-mark]")).toHaveCount(0);
  expect(asked.forYou).toEqual([""]);
  expect(asked.devices[0]).toMatch(/^[0-9a-f-]{36}$/);

  await page.waitForTimeout(2_500);
  await hideTab(page);
  await expect.poll(() => asked.seen.length).toBeGreaterThan(0);
  const first = asked.seen[0];
  expect(first.feed).toBe("for-you");
  expect(first.uris).toContain(uri(1));
  const read = first.dwell?.find((entry) => entry.uri === uri(1));
  expect(read?.ms).toBeGreaterThanOrEqual(2_000);
  expect(read?.ms).toBeLessThan(600_000);

  await expect
    .poll(
      async () => {
        await scrollToEnd(page);
        return asked.forYou;
      },
      { timeout: 20_000 },
    )
    .toEqual(["", CURSOR]);
  await expect(feed.locator(`[data-remote-uri="${uri(14)}"]`)).toBeVisible();
  await expect(feed.locator(`[data-remote-uri="${uri(12)}"]`)).toHaveCount(1);
  await expect(feed.getByRole("heading", { name: "이미 본 글" })).toHaveCount(1);
  await expect(feed.locator('[data-remote-kept="31"]')).toContainText("이미 본 글");
});

test("추천 draws other servers' posts among mine in the order the server ranked them, each marked 다른 서버", async ({
  page,
}) => {
  await signIn(page);
  const asked = await serve(page, {
    forYou: EXPLORE,
    home: {
      items: [
        { kind: "remote", remote: pooled(1) },
        { kind: "note", note: note(101, "kurl 노트 1") },
        { kind: "remote", remote: kept(31) },
        { kind: "note", note: note(102, "kurl 노트 2") },
        { kind: "remote", remote: pooled(1) },
        { kind: "remote", remote: { ...kept(101), uri: "https://mastodon.social/users/mina/statuses/101" } },
        { kind: "remote", remote: pooled(2) },
      ],
      next: null,
    },
  });
  await page.goto("/ko/blog");
  const feed = page.getByTestId("home-feed");
  await expect(feed.locator(`[data-remote-uri="${uri(2)}"]`)).toBeAttached({ timeout: 30_000 });
  expect(await homeOrder(page)).toEqual(["R1", "101", "K31", "102", "R2"]);
  await expect(feed.locator("[data-remote-mark]")).toHaveCount(3);
  await expect(feed.locator('[data-remote-kept="31"] [data-remote-mark]')).toHaveText("다른 서버");
  await expect(feed.locator('article[data-note-id="101"]')).not.toContainText("다른 서버");
  expect(asked.forYou).toEqual([]);
  expect(asked.home.every((search) => new URLSearchParams(search).get("tab") === "for-you")).toBe(true);
});

test("팔로잉 never mixes in other servers' 맞춤", async ({ page }) => {
  await signIn(page);
  const asked = await serve(page, { forYou: EXPLORE, home: { items: MINE, next: null } });
  await page.goto("/ko/blog?sort=following");
  await expect(page.locator('article[data-note-id="112"]')).toBeAttached({ timeout: 30_000 });
  await expect(page.locator("[data-remote-mark]")).toHaveCount(0);
  expect(asked.forYou).toEqual([]);
});
