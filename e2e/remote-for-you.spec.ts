import { expect, test, type Page, type Route } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

// Mock lane (Playwright routes): 홈 추천 is one list the server ranks (tab=for-you); other servers' posts
// in it are marked 다른 서버 and it never asks /federation/for-you.
test.use({ viewport: { width: 390, height: 844 } });

const NOW = "2026-10-22T09:00:00Z";

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

type Body = { items: unknown[]; next: string | null };

const MINE = Array.from({ length: 12 }, (_, i) => ({ kind: "note", note: note(101 + i, `kurl 노트 ${i + 1}`) }));

async function serve(page: Page, home: Body) {
  const asked = { forYou: [] as string[], home: [] as string[] };
  await mockBackend(page, {
    "GET /api/v1/federation/for-you": (route: Route) => {
      asked.forYou.push(new URL(route.request().url()).search);
      return route.fulfill({ json: { items: [pooled(9)], next: null } });
    },
    "POST /api/v1/federation/seen": (route: Route) => route.fulfill({ status: 202, body: "" }),
    "GET /api/v1/public/home": (route: Route) => {
      const url = new URL(route.request().url());
      asked.home.push(url.search);
      if (url.searchParams.has("since")) return route.fulfill({ json: { items: [], next: null, gap: false, newest: "150" } });
      return route.fulfill({ json: { ...home, ...(url.searchParams.get("tab") === "following" ? { newest: "101" } : {}) } });
    },
  });
  return asked;
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

test("추천 draws other servers' posts among mine in the order the server ranked them, each marked 다른 서버", async ({
  page,
}) => {
  await signIn(page);
  const asked = await serve(page, {
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
  const asked = await serve(page, { items: MINE, next: null });
  await page.goto("/ko/blog?sort=following");
  await expect(page.locator('article[data-note-id="112"]')).toBeAttached({ timeout: 30_000 });
  await expect(page.locator("[data-remote-mark]")).toHaveCount(0);
  expect(asked.forYou).toEqual([]);
});
