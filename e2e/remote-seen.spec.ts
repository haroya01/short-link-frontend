import { expect, test, type Page, type Route } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

// Mock lane (Playwright routes): 다른 서버 최신 puts what the reader has not seen first. The page that
// starts the seen part carries seenFrom and the list draws 이미 본 글 above that row. A post counts as
// seen after a second at least half on screen; those go to /federation/seen in batches, with the
// device id when signed out. An empty page with a next is followed at once, three times in a row.
test.use({ viewport: { width: 390, height: 844 } });

const NOW = "2026-10-22T09:00:00Z";
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

type Page_ = { items: unknown[]; next: string | null; seenFrom?: number };
type Seen = { uris: string[]; device: string | null; auth: string | null };

async function serve(page: Page, latest: (cursor: string | null) => Page_, home?: Page_) {
  const asked = { latest: [] as string[], devices: [] as (string | null)[], seen: [] as Seen[] };
  await mockBackend(page, {
    "GET /api/v1/federation/latest": (route: Route) => {
      const cursor = new URL(route.request().url()).searchParams.get("cursor");
      asked.latest.push(cursor ?? "");
      asked.devices.push(route.request().headers()["x-kurl-device"] ?? null);
      return route.fulfill({ json: latest(cursor) });
    },
    "POST /api/v1/federation/seen": (route: Route) => {
      const headers = route.request().headers();
      asked.seen.push({
        uris: route.request().postDataJSON().uris,
        device: headers["x-kurl-device"] ?? null,
        auth: headers.authorization ?? null,
      });
      return route.fulfill({ status: 202, body: "" });
    },
    "GET /api/v1/public/home": (route: Route) => {
      if (new URL(route.request().url()).searchParams.has("since")) {
        return route.fulfill({ json: { items: [], next: null, gap: false } });
      }
      return route.fulfill({ json: { ...(home ?? { items: [], next: null }), newest: "101" } });
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

const sentUris = (asked: { seen: Seen[] }) => asked.seen.flatMap((batch) => batch.uris);

test("a signed-out reader sees 이미 본 글 above the row at seenFrom, and what stayed on screen is sent with the device id", async ({
  page,
}) => {
  const asked = await serve(page, (cursor) =>
    cursor === "s1.t12"
      ? { items: [pooled(13), pooled(14)], next: null }
      : { items: Array.from({ length: 12 }, (_, i) => pooled(i + 1)), next: "s1.t12", seenFrom: 2 },
  );
  await page.addInitScript(() => window.localStorage.setItem("kurl:cookie-consent:v1", "accepted"));
  await page.goto("/ko/blog/explore?lane=remote");
  const latest = page.locator('[data-explore-lane="remote"] [data-testid="remote-feed"]');
  await expect(latest.locator(`[data-remote-uri="${uri(1)}"]`)).toBeVisible({ timeout: 30_000 });

  const divider = latest.getByRole("heading", { name: "이미 본 글", exact: true });
  await expect(divider).toHaveCount(1);
  await expect(divider).toHaveText("이미 본 글");
  await expect(divider.locator("svg")).toHaveCount(0);
  await expect(latest.locator("[data-remote-uri]").nth(2)).toContainText("이미 본 글");
  await expect(latest.locator("[data-remote-uri]").nth(1)).not.toContainText("이미 본 글");
  const line = (await divider.boundingBox())!;
  const third = (await latest.locator(`[data-remote-uri="${uri(3)}"] article`).boundingBox())!;
  expect(line.y + line.height).toBeLessThanOrEqual(third.y + 1);

  const device = asked.devices[0];
  expect(device).toMatch(UUID);
  expect(await page.evaluate(() => window.localStorage.getItem("kurl:device-id"))).toBe(device);

  await page.waitForTimeout(1_500);
  await hideTab(page);
  await expect.poll(() => asked.seen.length).toBe(1);
  expect(asked.seen[0].device).toBe(device);
  expect(asked.seen[0].auth).toBeNull();
  expect(asked.seen[0].uris).toContain(uri(1));
  expect(asked.seen[0].uris).not.toContain(uri(12));

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(latest.locator(`[data-remote-uri="${uri(14)}"]`)).toBeVisible();
  await page.waitForTimeout(1_500);
  await page.getByRole("tab", { name: "추천" }).click();
  await expect.poll(() => asked.seen.length).toBe(2);
  expect(asked.seen[1].uris).toContain(uri(14));
  expect(asked.seen[1].uris.filter((sent) => asked.seen[0].uris.includes(sent))).toEqual([]);
  expect(asked.devices.every((sent) => sent === device)).toBe(true);
});

test("a row scrolled past in under a second is not sent", async ({ page }) => {
  const asked = await serve(page, () => ({ items: Array.from({ length: 20 }, (_, i) => pooled(i + 1)), next: null }));
  await page.addInitScript(() => window.localStorage.setItem("kurl:cookie-consent:v1", "accepted"));
  await page.goto("/ko/blog/explore?lane=remote");
  const latest = page.locator('[data-explore-lane="remote"] [data-testid="remote-feed"]');
  await expect(latest.locator(`[data-remote-uri="${uri(1)}"]`)).toBeVisible({ timeout: 30_000 });

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1_500);
  await hideTab(page);
  await expect.poll(() => asked.seen.length).toBe(1);
  expect(asked.seen[0].uris).toContain(uri(20));
  expect(asked.seen[0].uris).not.toContain(uri(1));
});

test("empty pages with a next are followed at once, three in a row, then the list waits", async ({ page }) => {
  let fill = 3;
  const asked = await serve(page, (cursor) => {
    const n = Number(cursor?.slice(1) ?? 0);
    if (n < fill) return { items: [], next: `u${n + 1}` };
    return { items: [pooled(1)], next: null };
  });
  await page.addInitScript(() => window.localStorage.setItem("kurl:cookie-consent:v1", "accepted"));
  await page.goto("/ko/blog/explore?lane=remote");
  const latest = page.locator('[data-explore-lane="remote"] [data-testid="remote-feed"]');
  await expect(latest.locator(`[data-remote-uri="${uri(1)}"]`)).toBeVisible({ timeout: 30_000 });
  expect(asked.latest).toEqual(["", "u1", "u2", "u3"]);

  fill = 99;
  asked.latest.length = 0;
  await page.reload();
  await expect.poll(() => asked.latest, { timeout: 30_000 }).toEqual(["", "u1", "u2", "u3"]);
  await page.waitForTimeout(1_500);
  expect(asked.latest).toHaveLength(4);
  await latest.getByRole("button", { name: "더 보기" }).click();
  await expect.poll(() => asked.latest).toEqual(["", "u1", "u2", "u3", "u4"]);
});

test("in 홈 the tail draws 이미 본 글 under its own heading, and a signed-in reader is sent by token, not device", async ({
  page,
}) => {
  await signIn(page);
  const asked = await serve(
    page,
    () => ({ items: [pooled(1), kept(31), pooled(2)], next: null, seenFrom: 1 }),
    { items: [{ kind: "note", note: note(101, "kurl 노트") }], next: null },
  );
  await page.goto("/ko/blog");
  const tail = page.getByTestId("home-remote-tail");
  await expect(tail.getByRole("heading", { name: "다른 서버 최신", level: 2 })).toBeVisible({ timeout: 30_000 });
  const divider = tail.getByRole("heading", { name: "이미 본 글", level: 3 });
  await expect(divider).toHaveCount(1);
  await expect(tail.locator('[data-remote-kept="31"]')).toContainText("이미 본 글");
  expect(asked.devices.every((sent) => sent === null)).toBe(true);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1_500);
  await hideTab(page);
  await expect.poll(() => asked.seen.length).toBe(1);
  expect(asked.seen[0].auth).toBe("Bearer e2e-token");
  expect(asked.seen[0].device).toBeNull();
  expect(sentUris(asked).sort()).toEqual([uri(1), uri(2), "https://mastodon.social/users/mina/statuses/31"].sort());
});
