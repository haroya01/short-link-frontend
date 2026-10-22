import { expect, test, type Page, type Route } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

// Mock lane (Playwright routes): other-server posts open in 맞춤 order (/federation/for-you) in 둘러보기 and
// in the 홈 tail. 최신 at the top of 둘러보기 다른 서버 switches to /federation/latest and stays in the URL. A for-you page can
// repeat a post from the page before; it is drawn once. What stayed on screen goes to
// /federation/seen with the feed it was shown in and how long it stayed at least half on screen.
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

const FOR_YOU: Record<string, { items: unknown[]; next: string | null; seenFrom?: number }> = {
  first: { items: Array.from({ length: 12 }, (_, i) => pooled(i + 1)), next: CURSOR },
  [CURSOR]: { items: [pooled(12), pooled(13), kept(31), pooled(14)], next: null, seenFrom: 2 },
};

type Seen = { feed?: string; uris: string[]; dwell?: { uri: string; ms: number }[] };

async function serve(page: Page, home?: { items: unknown[]; next: string | null }) {
  const asked = { forYou: [] as string[], latest: [] as string[], devices: [] as (string | null)[], seen: [] as Seen[] };
  await mockBackend(page, {
    "GET /api/v1/federation/for-you": (route: Route) => {
      const cursor = new URL(route.request().url()).searchParams.get("cursor");
      asked.forYou.push(cursor ?? "");
      asked.devices.push(route.request().headers()["x-kurl-device"] ?? null);
      return route.fulfill({ json: FOR_YOU[cursor ?? "first"] });
    },
    "GET /api/v1/federation/latest": (route: Route) => {
      asked.latest.push(new URL(route.request().url()).searchParams.get("cursor") ?? "");
      return route.fulfill({ json: { items: [pooled(50), pooled(51)], next: null } });
    },
    "POST /api/v1/federation/seen": (route: Route) => {
      asked.seen.push(route.request().postDataJSON());
      return route.fulfill({ status: 202, body: "" });
    },
    "GET /api/v1/public/home": (route: Route) =>
      route.fulfill({ json: { ...(home ?? { items: [], next: null }), newest: "101" } }),
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

test("둘러보기 다른 서버 opens in 맞춤 over two pages, sends the time read with its feed, and 최신 switches and stays", async ({
  page,
}) => {
  const asked = await serve(page);
  await page.addInitScript(() => window.localStorage.setItem("kurl:cookie-consent:v1", "accepted"));
  await page.goto("/ko/blog/explore?lane=remote");
  const feed = page.locator('[data-explore-lane="remote"] [data-testid="remote-feed"]');
  const order = feed.getByRole("group", { name: "정렬" });
  await expect(feed.locator(`[data-remote-uri="${uri(1)}"]`)).toBeVisible({ timeout: 30_000 });
  await expect(feed).toHaveAttribute("data-remote-view", "for-you");
  await expect(order.getByRole("button")).toHaveText(["맞춤", "최신"]);
  await expect(order.getByRole("button", { name: "맞춤" })).toHaveAttribute("aria-pressed", "true");
  expect(asked.forYou).toEqual([""]);
  expect(asked.latest).toEqual([]);
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
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        return asked.forYou;
      },
      { timeout: 20_000 },
    )
    .toEqual(["", CURSOR]);
  await expect(feed.locator(`[data-remote-uri="${uri(14)}"]`)).toBeVisible();
  await expect(feed.locator(`[data-remote-uri="${uri(12)}"]`)).toHaveCount(1);
  await expect(feed.getByRole("heading", { name: "이미 본 글" })).toHaveCount(1);
  await expect(feed.locator('[data-remote-kept="31"]')).toContainText("이미 본 글");

  await page.evaluate(() => window.scrollTo(0, 0));
  await order.getByRole("button", { name: "최신" }).click();
  await expect(page).toHaveURL(/\/explore\?lane=remote&order=latest$/);
  await expect(feed).toHaveAttribute("data-remote-view", "latest");
  await expect(order.getByRole("button", { name: "최신" })).toHaveAttribute("aria-pressed", "true");
  await expect(feed.locator(`[data-remote-uri="${uri(50)}"]`)).toBeVisible();
  await expect(feed.locator(`[data-remote-uri="${uri(1)}"]`)).toHaveCount(0);
  expect(asked.latest).toEqual([""]);

  await page.waitForTimeout(1_500);
  await hideTab(page);
  await expect.poll(() => asked.seen.some((batch) => batch.feed === "latest" && batch.uris.includes(uri(50)))).toBe(true);
  expect(asked.seen.every((batch) => batch.feed === "for-you" || batch.feed === "latest")).toBe(true);
  expect(asked.seen.filter((batch) => batch.uris.includes(uri(50))).every((batch) => batch.feed === "latest")).toBe(true);

  await page.reload();
  await expect(feed.locator(`[data-remote-uri="${uri(50)}"]`)).toBeVisible({ timeout: 30_000 });
  await expect(feed.getByRole("group", { name: "정렬" }).getByRole("button", { name: "최신" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await feed.getByRole("group", { name: "정렬" }).getByRole("button", { name: "맞춤" }).click();
  await expect(page).toHaveURL(/\/explore\?lane=remote$/);
  await expect(feed.locator(`[data-remote-uri="${uri(1)}"]`)).toBeVisible();
});

test("the 홈 tail follows in 맞춤 order under 다른 서버, with no switch", async ({ page }) => {
  await signIn(page);
  const asked = await serve(page, { items: [{ kind: "note", note: note(101, "kurl 노트") }], next: null });
  await page.goto("/ko/blog");
  const tail = page.getByTestId("home-remote-tail");
  await expect(tail.getByRole("heading", { name: "다른 서버", exact: true, level: 2 })).toBeVisible({ timeout: 30_000 });
  await expect(tail.locator(`[data-remote-uri="${uri(1)}"]`)).toBeVisible();
  await expect(tail.getByRole("group", { name: "정렬" })).toHaveCount(0);
  expect(asked.forYou[0]).toBe("");
  expect(asked.latest).toEqual([]);
});
