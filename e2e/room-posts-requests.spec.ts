import { expect, test, type Route } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

// Mock lane (Playwright routes): what the web sends for room blog posts and for 홈's refresh.
const NOW = "2026-10-21T09:00:00Z";

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

const ROOM = {
  id: 7,
  name: "우리 방",
  role: "OWNER",
  approvalRequired: false,
  hiddenFromFeed: false,
  memberCount: 2,
  members: [
    { id: 1, username: "e2euser", displayName: null, avatarUrl: null, role: "OWNER" },
    { id: 2, username: "ben", displayName: "벤", avatarUrl: null, role: "MEMBER" },
  ],
};

const DRAFT = {
  id: 31,
  slug: "p-1",
  title: "여행 정리",
  status: "DRAFT",
  languageTag: "ko",
  publishedAt: null,
  scheduledAt: null,
  excerpt: null,
  ogImageUrl: null,
  viewCount: 0,
  likeCount: 0,
  tags: [],
  seriesId: null,
  seriesOrder: null,
  pinOrder: null,
  createdAt: NOW,
  updatedAt: NOW,
  contentVersion: 1,
  audience: "ROOM",
  room: { id: 7, name: "우리 방" },
  blockedCountries: [],
};

test.describe("a room post", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("the 글 button's editor creates the very first draft inside the room, never public", async ({ page }) => {
    const created: Record<string, unknown>[] = [];
    const patches: Record<string, unknown>[] = [];
    await signIn(page);
    await mockBackend(page, {
      "GET /api/v1/rooms/7": (route) => route.fulfill({ json: ROOM }),
      "GET /api/v1/rooms": (route) => route.fulfill({ json: [] }),
      "POST /api/v1/posts": (route: Route) => {
        created.push(route.request().postDataJSON());
        return route.fulfill({ status: 201, json: DRAFT });
      },
      "GET /api/v1/posts/31": (route) => route.fulfill({ json: DRAFT }),
      "PATCH /api/v1/posts/31": (route) => {
        patches.push(route.request().postDataJSON());
        return route.fulfill({ json: DRAFT });
      },
      "GET /api/v1/posts/31/blocks": (route) => route.fulfill({ json: [] }),
      "PUT /api/v1/posts/31/blocks": (route) => route.fulfill({ json: [] }),
    });
    await page.goto("/ko/blog/write/new?room=7");
    await expect(page.locator("[data-editor-room]")).toHaveText("우리 방 멤버만 읽는 글", { timeout: 30_000 });
    await page.locator('textarea[autocomplete="off"]').first().fill("여행 정리");
    await expect.poll(() => created.length, { timeout: 15_000 }).toBe(1);
    expect(created[0]).toMatchObject({ title: "여행 정리", audience: "ROOM", roomId: 7 });
    expect(patches.every((body) => body.audience === undefined || body.audience === "ROOM")).toBe(true);
  });
});

test.describe("홈 refresh", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("pressing 홈 on 최신 asks the first page again with seen=hide, and lays out what is still unseen in place of what was there", async ({
    page,
  }) => {
    const asked: string[] = [];
    let seenBeforeAgain = false;
    await signIn(page);
    await mockBackend(page, {
      "GET /api/v1/public/home": (route) => {
        const url = new URL(route.request().url());
        asked.push(url.search);
        const again = asked.filter((search) => !search.includes("cursor=")).length > 1;
        const items = again
          ? [{ kind: "note", note: note(102, "새로 온 노트") }, { kind: "note", note: note(103, "아직 안 본 노트") }]
          : [{ kind: "note", note: note(101, "원래 있던 노트") }];
        return route.fulfill({ json: { items, next: null, newest: again ? "102.0" : "101.0" } });
      },
      "GET /api/v1/federation/for-you": (route) => route.fulfill({ json: { items: [], next: null } }),
      "POST /api/v1/federation/seen": (route) => {
        seenBeforeAgain = asked.length === 1;
        return route.fulfill({ status: 202, body: "" });
      },
    });
    await page.goto("/ko/blog");
    const feed = page.getByTestId("home-feed");
    await expect(feed.locator("article[data-note-id]")).toHaveText([/원래 있던 노트/], { timeout: 30_000 });

    await page.locator("nav.vt-bottom-nav").getByRole("link", { name: "홈" }).click();
    await expect(feed.locator("article[data-note-id]")).toHaveText([/새로 온 노트/, /아직 안 본 노트/]);
    expect(seenBeforeAgain).toBe(true);
    expect(asked).toHaveLength(2);
    const again = new URLSearchParams(asked[1]);
    expect([again.get("tab"), again.get("seen"), again.get("since"), again.get("cursor")]).toEqual([
      "latest",
      "hide",
      null,
      null,
    ]);
  });

  test("pressing 홈 on 팔로잉 asks only for what came after the newest it has, then lays it on top", async ({ page }) => {
    const asked: string[] = [];
    await signIn(page);
    await mockBackend(page, {
      "GET /api/v1/public/home": (route) => {
        const url = new URL(route.request().url());
        const since = url.searchParams.get("since");
        asked.push(since ?? "-");
        if (!since) {
          return route.fulfill({ json: { items: [{ kind: "note", note: note(101, "원래 있던 노트") }], next: null, newest: "101.0" } });
        }
        if (since === "101.0") {
          return route.fulfill({ json: { items: [{ kind: "note", note: note(102, "새로 온 노트") }], next: null, newest: "102.0", gap: false } });
        }
        return route.fulfill({
          json: { items: [{ kind: "note", note: note(300, "갈아 끼운 첫 쪽") }], next: null, newest: "300.0", gap: true },
        });
      },
    });
    await page.goto("/ko/blog?sort=following");
    const feed = page.getByTestId("home-feed");
    await expect(feed.locator("article[data-note-id]")).toHaveText([/원래 있던 노트/], { timeout: 30_000 });

    const home = page.locator("nav.vt-bottom-nav").getByRole("link", { name: "홈" });
    await home.click();
    await expect(feed.locator("article[data-note-id]")).toHaveText([/새로 온 노트/, /원래 있던 노트/]);
    expect(asked.filter((s) => s !== "-")).toEqual(["101.0"]);

    await home.click();
    await expect(feed.locator("article[data-note-id]")).toHaveText([/갈아 끼운 첫 쪽/]);
    expect(asked.filter((s) => s !== "-")).toEqual(["101.0", "102.0"]);
  });

  test("인기 starts over instead of asking since", async ({ page }) => {
    const asked: string[] = [];
    await signIn(page);
    await mockBackend(page, {
      "GET /api/v1/public/home": (route) => {
        const url = new URL(route.request().url());
        asked.push(url.searchParams.get("since") ?? "-");
        return route.fulfill({ json: { items: [{ kind: "note", note: note(101, "인기 노트") }], next: null, newest: "101.0" } });
      },
    });
    await page.goto("/ko/blog?sort=trending");
    await expect(page.getByTestId("home-feed").locator("article[data-note-id]").first()).toBeVisible({ timeout: 30_000 });
    const before = asked.length;
    await page.locator("nav.vt-bottom-nav").getByRole("link", { name: "홈" }).click();
    await expect.poll(() => asked.length).toBeGreaterThan(before);
    expect(asked.every((s) => s === "-")).toBe(true);
  });
});
