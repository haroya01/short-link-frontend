import { expect, test, type Page, type Route } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";
import { expectOnTop, toastBy } from "./helpers/on-top";

test.use({ viewport: { width: 390, height: 844 } });

const HOSTS = ["qdon.space", "mstdn.jp", "planet.moe", "fedibird.com", "mastodon.social", "social.silicon.moe", "misskey.io"];

function trending(index: number) {
  const host = HOSTS[index];
  const user = `user${index}`;
  return {
    id: null,
    body: `인기 글 ${index + 1}번`,
    createdAt: "2026-10-16T13:48:01.441Z",
    editedAt: null,
    likeCount: 128,
    likedByMe: null,
    author: {
      id: index === 0 ? -412 : null,
      username: `${user}@${host}`,
      avatarUrl: null,
      displayName: `작성자 ${index + 1}`,
      remoteId: index === 0 ? 412 : null,
      url: `https://${host}/@${user}`,
    },
    media: [],
    quotedPost: null,
    inReplyToId: null,
    replyCount: 4,
    repostCount: 37,
    repostedByMe: null,
    quotedNote: null,
    linkPreview: null,
    repostedBy: null,
    quoteCount: 0,
    bookmarkedByMe: null,
    mentions: [],
    contentWarning: null,
    sensitive: false,
    pinned: false,
    visibility: "public",
    poll: null,
    conversationMuted: null,
    language: "ko",
    thread: null,
    replyPolicy: "everyone",
    canReply: null,
    hidden: false,
    remote: { kind: "NOTE", title: null, url: `https://${host}/@${user}/${1000 + index}`, community: null },
    uri: `https://${host}/users/${user}/statuses/${1000 + index}`,
    url: `https://${host}/@${user}/${1000 + index}`,
    sourceHost: host,
    servers: index === 0 ? [host, "planet.moe"] : [host],
  };
}

const ITEMS = Array.from({ length: 7 }, (_, i) => trending(i));
const FIRST = ITEMS[0];

const LOCAL = {
  ...FIRST,
  id: 4321,
  likeCount: null,
  likedByMe: false,
  repostCount: null,
  author: { ...FIRST.author, id: -412, remoteId: 412 },
  uri: undefined,
  url: undefined,
  sourceHost: undefined,
  servers: undefined,
};

const RECEIVED = {
  ...LOCAL,
  id: 12,
  body: "받은 노트 하나",
  author: { id: -9800, username: "mina@mastodon.social", avatarUrl: null, displayName: "Mina", remoteId: 9800 },
};

function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => (open = resolve));
  return { opened, open };
}

type Serve = {
  trending?: (route: Route, call: number) => Promise<void>;
  latest?: (route: Route) => Promise<void>;
  resolve?: (route: Route) => Promise<void>;
};

const RECEIVED_2 = { ...RECEIVED, id: 11, body: "받은 노트 둘" };

function cursorOf(route: Route) {
  return new URL(route.request().url()).searchParams.get("cursor");
}

async function serve(page: Page, { trending: list, latest, resolve }: Serve = {}) {
  const seen = {
    trending: [] as string[],
    latest: [] as string[],
    resolved: [] as string[],
    liked: [] as string[],
    reposted: [] as string[],
    created: [] as unknown[],
  };
  await mockBackend(page, {
    "GET /api/v1/federation/trending": async (route) => {
      seen.trending.push(new URL(route.request().url()).search);
      if (list) await list(route, seen.trending.length);
      else await route.fulfill({ json: { items: ITEMS } });
    },
    "GET /api/v1/federation/latest": async (route) => {
      seen.latest.push(new URL(route.request().url()).search);
      if (latest) await latest(route);
      else await route.fulfill({ json: { items: ITEMS.slice(2), next: null } });
    },
    "GET /api/v1/federation/resolve": async (route) => {
      seen.resolved.push(new URL(route.request().url()).searchParams.get("q") ?? "");
      if (resolve) await resolve(route);
      else await route.fulfill({ json: { account: null, note: LOCAL } });
    },
    "PUT /api/v1/notes/4321/like": (route) => {
      seen.liked.push(route.request().method());
      return route.fulfill({ json: { liked: true, likeCount: 1 } });
    },
    "DELETE /api/v1/notes/4321/like": (route) => {
      seen.liked.push(route.request().method());
      return route.fulfill({ json: { liked: false, likeCount: 0 } });
    },
    "PUT /api/v1/notes/4321/repost": (route) => {
      seen.reposted.push("PUT");
      return route.fulfill({ json: { reposted: true, repostCount: 38 } });
    },
    "POST /api/v1/notes": (route) => {
      seen.created.push(route.request().postDataJSON());
      return route.fulfill({ status: 201, json: { ...LOCAL, id: 9001, body: "덧붙인 생각", quotedNote: { ...LOCAL } } });
    },
    "GET /api/v1/federation/settings": (route) => route.fulfill({ json: { enabled: true, noticeSeen: true, handle: null } }),
  });
  return seen;
}

function lane(page: Page, key: "picks" | "remote") {
  const group = page.locator(`[data-explore-lane="${key}"] [data-testid="remote-feed"]`);
  return { group, card: (index: number) => group.locator(`[data-remote-uri="${ITEMS[index].uri}"]`) };
}

async function open(page: Page) {
  await page.goto("/ko/blog/explore");
  return lane(page, "picks");
}

async function scrollToEnd(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

test("추천 ends in what is trending elsewhere and keeps going as the reader scrolls: the trending pool, then received notes under their heading", async ({
  page,
}) => {
  const answer = gate();
  const second = gate();
  await signIn(page);
  const seen = await serve(page, {
    trending: async (route) => {
      const cursor = cursorOf(route);
      if (cursor === null) {
        await answer.opened;
        return route.fulfill({ json: { items: ITEMS.slice(0, 5), next: "t5" } });
      }
      if (cursor === "t5") {
        await second.opened;
        return route.fulfill({ json: { items: ITEMS.slice(5), next: "r" } });
      }
      if (cursor === "r") return route.fulfill({ json: { items: [RECEIVED], next: "r12" } });
      return route.fulfill({ json: { items: [RECEIVED_2], next: null } });
    },
  });
  const { group, card } = await open(page);

  await expect(page.getByRole("tab", { name: "추천" })).toHaveAttribute("aria-selected", "true", { timeout: 30_000 });
  await expect(group).toHaveAttribute("data-remote-view", "trending");
  await expect(group.locator('[data-testid="note-list-skeleton"] > div')).toHaveCount(3);
  answer.open();

  await expect(group.locator("[data-remote-uri]")).toHaveCount(5);
  await expect(card(0)).toContainText("qdon.space 외 1곳에서 인기");
  await expect(card(1)).toContainText("mstdn.jp에서 인기");
  await expect(card(0).getByRole("button", { name: "좋아요", exact: true })).toHaveText("128");
  await expect(card(0).getByRole("button", { name: "노트 메뉴" })).toBeVisible();
  await expect(card(0).getByRole("button", { name: /답글 쓰기/ })).toHaveText(/4/);
  await expect(card(0).getByRole("button", { name: "리포스트", exact: true })).toHaveText("37");
  await expect(card(0).locator("a[href$='/remote/412']").first()).toBeVisible();
  second.open();

  await expect
    .poll(
      async () => {
        await scrollToEnd(page);
        return seen.trending;
      },
      { timeout: 20_000 },
    )
    .toEqual(["?limit=20", "?limit=20&cursor=t5", "?limit=20&cursor=r", "?limit=20&cursor=r12"]);
  await expect(group.locator("[data-remote-uri]")).toHaveCount(7);
  const received = group.getByRole("heading", { name: "받은 노트" });
  await expect(received).toHaveCount(1);
  const headingBox = (await received.boundingBox())!;
  const lastTrending = (await card(6).boundingBox())!;
  const first = (await group.locator('article[data-note-id="12"]').boundingBox())!;
  const next = (await group.locator('article[data-note-id="11"]').boundingBox())!;
  expect(headingBox.y).toBeGreaterThan(lastTrending.y + lastTrending.height - 1);
  expect(first.y).toBeGreaterThan(headingBox.y);
  expect(next.y).toBeGreaterThan(first.y);
  await expect(group.getByRole("button", { name: "더 보기" })).toHaveCount(0);
  expect(seen.resolved).toEqual([]);
});

test("다른 서버 최신 lists the latest posts from other servers without the trending line, and pages on its own cursor", async ({
  page,
}) => {
  await signIn(page);
  const seen = await serve(page, {
    latest: (route) =>
      cursorOf(route) === null
        ? route.fulfill({ json: { items: ITEMS.slice(0, 4), next: "t4" } })
        : route.fulfill({ json: { items: ITEMS.slice(4), next: null } }),
  });
  const picks = await open(page);
  await expect(picks.card(0)).toBeVisible({ timeout: 30_000 });

  await page.getByRole("tab", { name: "다른 서버" }).click();
  await expect(page).toHaveURL(/\/explore\?lane=remote$/);
  await expect(page.getByRole("tab", { name: "다른 서버" })).toHaveAttribute("aria-selected", "true");
  const { group, card } = lane(page, "remote");
  await group.getByRole("group", { name: "정렬" }).getByRole("button", { name: "최신" }).click();
  await expect(page).toHaveURL(/\/explore\?lane=remote&order=latest$/);
  await expect(group).toHaveAttribute("data-remote-view", "latest");
  await expect(card(3)).toBeVisible();
  await expect(card(0)).not.toContainText("에서 인기");
  await expect(card(0).getByRole("button", { name: "좋아요", exact: true })).toHaveText("128");

  await expect
    .poll(
      async () => {
        await scrollToEnd(page);
        return seen.latest;
      },
      { timeout: 20_000 },
    )
    .toEqual(["?limit=20", "?limit=20&cursor=t4"]);
  await expect(group.locator("[data-remote-uri]")).toHaveCount(7);
  await expect(group.getByRole("heading", { name: "받은 노트" })).toHaveCount(0);
  expect(seen.trending).toEqual(["?limit=20"]);
});

test("a page that fails further down says so under the list, and 다시 시도 picks up from there", async ({ page }) => {
  await signIn(page);
  let failed = false;
  const seen = await serve(page, {
    trending: async (route) => {
      const cursor = cursorOf(route);
      if (cursor === null) return route.fulfill({ json: { items: ITEMS.slice(0, 5), next: "t5" } });
      if (!failed) {
        failed = true;
        return route.fulfill({ status: 503, json: { status: 503, title: "Service Unavailable" } });
      }
      return route.fulfill({ json: { items: ITEMS.slice(5), next: null } });
    },
  });
  const { group } = await open(page);
  await expect(group.locator("[data-remote-uri]")).toHaveCount(5, { timeout: 30_000 });
  await expect
    .poll(
      async () => {
        await scrollToEnd(page);
        return seen.trending.length;
      },
      { timeout: 20_000 },
    )
    .toBe(2);
  await expect(group.getByText("불러오지 못했어요", { exact: true })).toBeVisible();
  await page.waitForTimeout(800);
  expect(seen.trending).toHaveLength(2);

  await group.getByRole("button", { name: "다시 시도" }).click();
  await expect(group.locator("[data-remote-uri]")).toHaveCount(7);
  expect(seen.trending).toEqual(["?limit=20", "?limit=20&cursor=t5", "?limit=20&cursor=t5"]);
});

test("liking brings the post over by its AP id, then likes the local note, and the post is brought over once", async ({
  page,
}) => {
  await signIn(page);
  const seen = await serve(page);
  const { card } = await open(page);
  const like = card(0).getByRole("button", { name: "좋아요", exact: true });
  await like.click({ timeout: 30_000 });

  await expect(card(0).getByRole("button", { name: "좋아요 취소" })).toHaveAttribute("aria-pressed", "true");
  await expect(card(0).getByRole("button", { name: "좋아요 취소" })).toHaveText("129");
  await expect.poll(() => seen.liked).toEqual(["PUT"]);
  expect(seen.resolved).toEqual([FIRST.uri]);
  expect(seen.resolved).not.toContain(FIRST.url);

  await card(0).getByRole("button", { name: /답글 쓰기/ }).click();
  await expect(page.getByRole("dialog")).toContainText("인기 글 1번");
  expect(seen.resolved).toHaveLength(1);
});

test("the heart fills at once and the post is brought over behind it, and it falls back when that fails", async ({ page }) => {
  const answer = gate();
  await signIn(page);
  const seen = await serve(page, {
    resolve: async (route) => {
      await answer.opened;
      await route.fulfill({ status: 404, json: { status: 404, code: "REMOTE_ACCOUNT_NOT_FOUND" } });
    },
  });
  const { card } = await open(page);
  await card(0).getByRole("button", { name: "좋아요", exact: true }).click({ timeout: 30_000 });

  const liked = card(0).getByRole("button", { name: "좋아요 취소" });
  await expect(liked).toHaveAttribute("aria-pressed", "true");
  await expect(liked).toHaveText("129");
  expect(seen.liked).toEqual([]);

  answer.open();
  await expectOnTop(toastBy(page, "qdon.space 서버에서 찾지 못했어요"));
  await expect(card(0).getByRole("button", { name: "좋아요", exact: true })).toHaveText("128");
  expect(seen.liked).toEqual([]);
});

test("reposting brings the post over by its AP id and reposts the local note", async ({ page }) => {
  await signIn(page);
  const seen = await serve(page);
  const { card } = await open(page);
  await card(0).getByRole("button", { name: "리포스트", exact: true }).click({ timeout: 30_000 });
  await card(0).getByRole("menuitem", { name: "리포스트" }).click();

  const reposted = card(0).getByRole("button", { name: "리포스트 취소" });
  await expect(reposted).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => seen.reposted).toEqual(["PUT"]);
  await expect(reposted).toHaveText("38");
  expect(seen.resolved).toEqual([FIRST.uri]);
});

test("quoting brings the post over and opens the quote composer on the local note", async ({ page }) => {
  await signIn(page);
  const seen = await serve(page);
  const { card } = await open(page);
  await card(0).getByRole("button", { name: "리포스트", exact: true }).click({ timeout: 30_000 });
  await card(0).getByRole("menuitem", { name: "인용" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("인기 글 1번");
  await dialog.getByRole("textbox", { name: "생각 덧붙이기" }).fill("덧붙인 생각");
  await dialog.getByRole("button", { name: "올리기" }).click();
  await expectOnTop(toastBy(page, "인용 노트를 올렸어요"));
  expect(seen.created).toEqual([expect.objectContaining({ body: "덧붙인 생각", quotedNoteId: 4321 })]);
  expect(seen.resolved).toEqual([FIRST.uri]);
});

test("a first like on a post the reader already liked there keeps the like", async ({ page }) => {
  await signIn(page);
  const seen = await serve(page, {
    resolve: (route) => route.fulfill({ json: { account: null, note: { ...LOCAL, likedByMe: true } } }),
  });
  const { card } = await open(page);
  await card(0).getByRole("button", { name: "좋아요", exact: true }).click({ timeout: 30_000 });

  await expect(card(0).getByRole("button", { name: "좋아요 취소" })).toHaveAttribute("aria-pressed", "true");
  await expect(card(0).getByRole("button", { name: "좋아요 취소" })).toHaveText("128");
  await page.waitForTimeout(500);
  expect(seen.liked).toEqual([]);
});

test("opening a trending post goes to the note brought over to this server", async ({ page }) => {
  await signIn(page);
  const seen = await serve(page);
  const { card } = await open(page);
  await card(0).getByText("인기 글 1번").click({ timeout: 30_000 });
  await expect(page).toHaveURL(/\/remote\/412\/notes\/4321$/);
  expect(seen.resolved).toEqual([FIRST.uri]);
});

test("a post its server no longer has names that server in a toast", async ({ page }) => {
  await signIn(page);
  await serve(page, {
    resolve: (route) => route.fulfill({ status: 404, json: { status: 404, code: "REMOTE_ACCOUNT_NOT_FOUND" } }),
  });
  const { card } = await open(page);
  await card(1).getByRole("button", { name: "좋아요", exact: true }).click({ timeout: 30_000 });
  await expectOnTop(toastBy(page, "mstdn.jp 서버에서 찾지 못했어요"));
  await expect(card(1).getByRole("button", { name: "좋아요", exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("signed-out readers see trending, then the sign-in line for received notes, and a like opens the login door", async ({
  page,
}) => {
  const seen = await serve(page);
  const { group, card } = await open(page);
  await expect(card(0)).toBeVisible({ timeout: 30_000 });
  await expect(group.locator("[data-remote-uri]")).toHaveCount(7);
  await expect(group.getByRole("heading", { name: "받은 노트" })).toBeVisible();
  await expect(page.getByTestId("sign-in-empty")).toContainText("다른 서버의 노트를 보려면 로그인하세요");

  await card(0).getByRole("button", { name: "좋아요", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("좋아요를 누르려면 로그인하세요");
  expect(seen.resolved).toEqual([]);
});

test("with nothing trending, received notes come straight in without a heading", async ({ page }) => {
  await signIn(page);
  const seen = await serve(page, {
    trending: (route) =>
      cursorOf(route) === null
        ? route.fulfill({ json: { items: [], next: "r" } })
        : route.fulfill({ json: { items: [RECEIVED], next: null } }),
  });
  const { group } = await open(page);
  await expect(group.locator('article[data-note-id="12"]')).toBeVisible({ timeout: 30_000 });
  expect(seen.trending).toEqual(["?limit=20", "?limit=20&cursor=r"]);
  await expect(group.locator("[data-remote-uri]")).toHaveCount(0);
  await expect(group.getByRole("heading", { name: "받은 노트" })).toHaveCount(0);
});

test("a list that failed says so in one grey line, and 다시 시도 loads it", async ({ page }) => {
  await signIn(page);
  const seen = await serve(page, {
    trending: (route, call) =>
      call === 1
        ? route.fulfill({ status: 503, json: { status: 503, title: "Service Unavailable" } })
        : route.fulfill({ json: { items: ITEMS } }),
  });
  const { group } = await open(page);
  const line = group.getByText("인기 글을 불러오지 못했어요").locator("..");
  await expect(line).toBeVisible({ timeout: 30_000 });
  await expect(line.locator("svg")).toHaveCount(0);

  await line.getByRole("button", { name: "다시 시도" }).click();
  await expect(group.locator("[data-remote-uri]")).toHaveCount(7);
  await expect(group.getByText("인기 글을 불러오지 못했어요")).toHaveCount(0);
  expect(seen.trending).toHaveLength(2);
});
