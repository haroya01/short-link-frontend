import { expect, test, type Page } from "@playwright/test";
import { expectOnTop } from "./helpers/on-top";

// A fulfilled stream ends with its body, so the client reconnects and each `send` answers the next connection.
// `kurl:mock-live` turns the client on in mock builds and feeds the mock lists what others just wrote.
const POST_PATH = "/ko/p/dohyun/nextjs-14-app-router-blog";

type Arrivals = {
  comments?: { id: number; parentId?: number | null; body: string }[];
  replies?: { id: number; inReplyToId: number; body: string }[];
  room?: { id: number; roomId: number; body: string }[];
};

const sse = (name: string, data: unknown, id?: string) =>
  `event: ${name}\n${id ? `id: ${id}\n` : ""}data: ${JSON.stringify(data)}\n\n`;

async function fakeLive(page: Page) {
  const tokens: string[] = [];
  const streams: URL[] = [];
  const bodies: string[] = [];
  const waiting: ((body: string) => void)[] = [];
  await page.addInitScript(() => {
    if (window.localStorage.getItem("kurl:mock-live") === null) window.localStorage.setItem("kurl:mock-live", "{}");
  });
  await page.route(
    (url) => url.pathname.startsWith("/api/v1/live/") && url.pathname.endsWith("/stream-token"),
    (route) => {
      tokens.push(route.request().url());
      return route.fulfill({ json: { streamToken: `tok-${tokens.length}` } });
    },
  );
  await page.route(
    (url) => url.pathname.startsWith("/api/v1/live/") && url.pathname.endsWith("/stream"),
    async (route) => {
      streams.push(new URL(route.request().url()));
      const body = bodies.shift() ?? (await new Promise<string>((resolve) => waiting.push(resolve)));
      await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body }).catch(() => {});
    },
  );
  return {
    tokens,
    streams,
    send(body: string) {
      const next = waiting.shift();
      if (next) next(body);
      else bodies.push(body);
    },
  };
}

const arrive = (page: Page, arrivals: Arrivals) =>
  page.evaluate((value) => window.localStorage.setItem("kurl:mock-live", JSON.stringify(value)), arrivals);

async function openComments(page: Page) {
  await page.goto(POST_PATH);
  await expect(page.locator(".prose-post")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#comment-3")).toBeVisible({ timeout: 15_000 });
}

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a comment someone else just wrote shows up without reloading", async ({ page }) => {
    const live = await fakeLive(page);
    await openComments(page);
    await expect.poll(() => live.streams.length).toBe(1);
    expect(live.tokens[0]).toContain("/api/v1/live/posts/");
    expect(live.streams[0].pathname).toMatch(/^\/api\/v1\/live\/posts\/\d+\/comments\/stream$/);
    expect(live.streams[0].searchParams.get("streamToken")).toBe("tok-1");
    expect(live.streams[0].searchParams.get("since")).toBe("7");

    await page.evaluate(() => ((window as unknown as { stayed: boolean }).stayed = true));
    await page.locator("#comment-3").scrollIntoViewIfNeeded();
    await arrive(page, { comments: [{ id: 501, body: "방금 단 댓글이에요" }] });
    live.send(
      sse("ready", { scope: "comments", scopeId: 1, cursor: "7" }) +
        sse("changed", { items: [{ kind: "comment", id: 501 }], more: false, cursor: "501" }, "501"),
    );

    const arrived = page.locator("#comment-501");
    await expect(arrived).toContainText("방금 단 댓글이에요");
    await expect(arrived).toContainText("minji");
    expect(await page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed)).toBe(true);
    await expect(page.getByTestId("live-line")).toHaveCount(0);

    await expect.poll(() => live.streams.length).toBe(2);
    expect(live.streams[1].searchParams.get("since")).toBe("501");
  });

  test("my own comment is not added a second time when its signal comes back", async ({ page }) => {
    const live = await fakeLive(page);
    await openComments(page);
    await expect.poll(() => live.streams.length).toBe(1);

    await page.getByTestId("comment-composer-placeholder").click();
    const composer = page.getByTestId("conversation-composer");
    await composer.getByRole("textbox", { name: "댓글 쓰기" }).fill("제가 쓴 댓글");
    await composer.getByRole("button", { name: "댓글 작성" }).click();
    const mine = page.locator("[id^=comment-]").filter({ hasText: "제가 쓴 댓글" });
    await expect(mine).toHaveCount(1);
    const myId = Number((await mine.getAttribute("id"))!.replace("comment-", ""));

    await arrive(page, { comments: [{ id: 502, body: "같이 들어온 남의 댓글" }] });
    live.send(
      sse("ready", { scope: "comments", scopeId: 1, cursor: "7" }) +
        sse("changed", { items: [{ kind: "comment", id: myId }, { kind: "comment", id: 502 }], more: false, cursor: "502" }, "502"),
    );

    await expect(page.locator("#comment-502")).toContainText("같이 들어온 남의 댓글");
    await expect(mine).toHaveCount(1);
  });

  test("a revoked stream is not opened again", async ({ page }) => {
    const live = await fakeLive(page);
    await openComments(page);
    await expect.poll(() => live.streams.length).toBe(1);
    live.send(sse("ready", { scope: "comments", scopeId: 1, cursor: "7" }) + sse("revoked", { scope: "comments", scopeId: 1 }));

    await page.waitForTimeout(5_000);
    expect(live.tokens).toHaveLength(1);
    expect(live.streams).toHaveLength(1);
  });

  test("busy moves the screen to polling for a minute, then back to the stream", async ({ page }) => {
    await page.clock.install();
    const live = await fakeLive(page);
    await openComments(page);
    await expect.poll(() => live.streams.length).toBe(1);
    live.send(sse("ready", { scope: "comments", scopeId: 1, cursor: "7" }) + sse("busy", { retryAfterSeconds: 60 }));
    await page.waitForTimeout(500);

    await arrive(page, { comments: [{ id: 503, body: "폴링으로 받은 댓글" }] });
    await page.clock.fastForward(36_000);
    await expect(page.locator("#comment-503")).toContainText("폴링으로 받은 댓글");
    expect(live.tokens).toHaveLength(1);

    await page.clock.fastForward(30_000);
    await expect.poll(() => live.streams.length).toBe(2);
    expect(live.tokens).toHaveLength(1);
  });

  test("after a goodbye the stream comes back on the token ready gave it, without asking for one", async ({ page }) => {
    const live = await fakeLive(page);
    await openComments(page);
    await expect.poll(() => live.streams.length).toBe(1);
    live.send(
      sse("ready", { scope: "comments", scopeId: 1, cursor: "7", streamToken: "from-ready", retryMs: 1_000 }) +
        sse("bye", { reason: "rotate", retryMs: 1_000 }),
    );
    await expect.poll(() => live.streams.length).toBe(2);
    expect(live.streams[1].searchParams.get("streamToken")).toBe("from-ready");
    expect(live.streams[1].searchParams.get("since")).toBe("7");
    expect(live.tokens).toHaveLength(1);
  });

  test("a reply above the reader waits behind the line, and tapping it washes where the new part starts", async ({ page }) => {
    const live = await fakeLive(page);
    await openComments(page);
    await expect.poll(() => live.streams.length).toBe(1);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await arrive(page, { comments: [{ id: 504, parentId: 1, body: "위쪽 댓글에 달린 새 답글" }] });
    live.send(sse("changed", { items: [{ kind: "comment", id: 504 }], more: false, cursor: "504" }, "504"));

    const line = page.getByTestId("live-line");
    await expectOnTop(line);
    await expect(line).toHaveText("새 댓글 1개");
    await expect(page.locator("#comment-504")).toHaveCount(0);

    await line.click();
    const washed = page.locator(".live-wash").filter({ has: page.locator("#comment-504") });
    await expect(washed).toHaveCount(1);
    await expect(page.locator("#comment-504")).toBeInViewport();
    expect(await washed.evaluate((el) => el.getAnimations().map((a) => (a as CSSAnimation).animationName))).toContain("note-wash");
    await expect(page.locator(".live-wash")).toHaveCount(1);
    await expect(line).toHaveCount(0);
  });

  test("a long comment list loads in pages with the server's count, and a new top-level comment waits for its page", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("kurl:mock-comments-many", "1"));
    const live = await fakeLive(page);
    await openComments(page);
    const tops = page.locator("#comments li[data-comment-top]");
    await expect(tops).toHaveCount(5);
    const heading = page.locator("#comments h2").first();
    await expect(heading).toHaveText("댓글 35개");
    await expect(page.getByTestId("comments-show-all")).toHaveCount(0);
    const more = page.getByTestId("comments-more");
    await expect(more).toHaveText("댓글 더 보기");
    await expect.poll(() => live.streams.length).toBe(1);
    expect(live.streams[0].searchParams.get("since")).toBe("229");

    await arrive(page, {
      comments: [
        { id: 701, body: "아직 안 부른 페이지 뒤의 새 댓글" },
        { id: 702, parentId: 1, body: "첫 페이지 댓글에 달린 새 답글" },
      ],
    });
    live.send(sse("changed", { items: [{ kind: "comment", id: 701 }, { kind: "comment", id: 702 }], more: false, cursor: "702" }, "702"));
    await expect(page.locator("#comment-702")).toContainText("첫 페이지 댓글에 달린 새 답글");
    await expect(page.locator("#comment-701")).toHaveCount(0);
    await expect(heading).toHaveText("댓글 37개");

    await more.click();
    await expect(tops).toHaveCount(20);
    await more.click();
    await expect(page.locator("#comments")).toContainText("지난 댓글 30");
    await expect(page.locator("#comment-701")).toContainText("아직 안 부른 페이지 뒤의 새 댓글");
    await expect(more).toHaveCount(0);
    await expect(heading).toHaveText("댓글 37개");
  });

  test("an older server without comment pages still gets new comments by reading the whole list", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("kurl:mock-comments-legacy", "1"));
    const live = await fakeLive(page);
    await openComments(page);
    await expect.poll(() => live.streams.length).toBe(1);
    expect(live.streams[0].searchParams.get("since")).toBe("7");
    await arrive(page, { comments: [{ id: 505, body: "옛 서버에서 받은 댓글" }] });
    live.send(sse("changed", { items: [{ kind: "comment", id: 505 }], more: false, cursor: "505" }, "505"));
    await expect(page.locator("#comment-505")).toContainText("옛 서버에서 받은 댓글");
  });

  test("a reply in an open thread shows up at the end of the replies", async ({ page }) => {
    const live = await fakeLive(page);
    await page.goto("/ko/p/yuna/notes/3");
    await expect(page.locator('[data-note-id="4"]')).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => live.streams.length).toBe(1);
    expect(live.streams[0].pathname).toBe("/api/v1/live/notes/3/stream");
    expect(live.streams[0].searchParams.get("since")).toBe("4");

    await arrive(page, { replies: [{ id: 9601, inReplyToId: 3, body: "스레드에 방금 단 답글" }] });
    live.send(sse("changed", { items: [{ kind: "reply", id: 9601 }], more: false, cursor: "9601" }, "9601"));

    const arrived = page.locator('[data-note-id="9601"]');
    await expect(arrived).toContainText("스레드에 방금 단 답글");
    expect(
      await arrived.evaluate(
        (el) => !!(document.querySelector('[data-note-id="4"]')!.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING),
      ),
    ).toBe(true);
    await expect(page.locator("#note-replies")).toContainText("2");
  });

  test("a long thread shows its first replies and the rest on request", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("kurl:mock-thread-long", "1"));
    const live = await fakeLive(page);
    await page.goto("/ko/p/yuna/notes/3");
    const replies = page.locator('section[aria-labelledby="note-replies"] > div > div > div > article[data-note-id]');
    const more = page.getByTestId("note-replies-more");
    await expect(more).toHaveText("답글 더 보기", { timeout: 30_000 });
    await expect(page.locator("#note-replies")).toHaveText("답글");
    await expect(replies).toHaveCount(20);
    await expect.poll(() => live.streams.length).toBe(1);

    await arrive(page, { replies: [{ id: 9602, inReplyToId: 3, body: "다 펼치기 전에 온 답글" }] });
    live.send(sse("changed", { items: [{ kind: "reply", id: 9602 }], more: false, cursor: "9602" }, "9602"));
    await page.waitForTimeout(2_000);
    await expect(page.locator('[data-note-id="9602"]')).toHaveCount(0);

    await more.click();
    await expect(more).toHaveCount(0);
    await expect(replies).toHaveCount(27);
    await expect(replies.last()).toContainText("다 펼치기 전에 온 답글");
    await expect(page.locator("#note-replies")).toHaveText("답글 27");
  });

  test("an older server without the replies path still gets a new reply", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("kurl:mock-replies-legacy", "1"));
    const live = await fakeLive(page);
    await page.goto("/ko/p/yuna/notes/3");
    await expect(page.locator('[data-note-id="4"]')).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => live.streams.length).toBe(1);
    await arrive(page, { replies: [{ id: 9603, inReplyToId: 3, body: "옛 서버에서 받은 답글" }] });
    live.send(sse("changed", { items: [{ kind: "reply", id: 9603 }], more: false, cursor: "9603" }, "9603"));
    await expect(page.locator('[data-note-id="9603"]')).toContainText("옛 서버에서 받은 답글");
  });

  test("an older server that ignores after still lands a room note once", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("kurl:mock-room-after-ignored", "1"));
    const live = await fakeLive(page);
    await page.goto("/ko/blog/rooms/1");
    const notes = page.locator("[data-room-notes]");
    await expect(notes.locator("article[data-note-id]").first()).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => live.streams.length).toBe(1);
    await arrive(page, { room: [{ id: 9992, roomId: 1, body: "옛 서버 방 글" }] });
    live.send(sse("changed", { items: [{ kind: "note", id: 9992 }], more: false, cursor: "9992" }, "9992"));
    await expect(notes.locator("article[data-note-id]").first()).toContainText("옛 서버 방 글");
    await expect(page.locator('[data-note-id="9992"]')).toHaveCount(1);
    await expect(page.locator('[data-note-id="9910"]')).toHaveCount(1);
  });

  test("a room note that would push the reader waits behind one line until they ask for it", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("kurl:mock-room-long", "1"));
    const live = await fakeLive(page);
    await page.goto("/ko/blog/rooms/1");
    const notes = page.locator("[data-room-notes]");
    await expect(notes.locator("article[data-note-id]").first()).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => live.streams.length).toBe(1);
    expect(live.streams[0].pathname).toBe("/api/v1/live/rooms/1/stream");
    expect(live.streams[0].searchParams.get("since")).toBe("9910");

    await notes.locator("article[data-note-id]").nth(12).scrollIntoViewIfNeeded();
    const before = await notes.locator("article[data-note-id]").nth(12).boundingBox();
    await arrive(page, { room: [{ id: 9990, roomId: 1, body: "방에 방금 올라온 글" }] });
    live.send(sse("changed", { items: [{ kind: "note", id: 9990 }], more: false, cursor: "9990" }, "9990"));

    const line = page.getByTestId("live-line");
    await expectOnTop(line);
    await expect(line).toHaveText("새 글 1개");
    await expect(page.locator('[data-note-id="9990"]')).toHaveCount(0);
    const after = await notes.locator("article[data-note-id]").nth(12).boundingBox();
    expect(after!.y).toBe(before!.y);

    await line.click();
    await expect(notes.locator("article[data-note-id]").first()).toContainText("방에 방금 올라온 글");
    await expect(line).toHaveCount(0);
  });
});

test.describe("on a desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("a new comment on a folded thread shows under the first five instead of hiding behind 모두 보기", async ({ page }) => {
    const live = await fakeLive(page);
    await page.goto("/ko/p/kazuki/weekend-hiking-burnout");
    const tops = page.locator("#comments li[data-comment-top]");
    await expect(tops).toHaveCount(5, { timeout: 30_000 });
    await expect.poll(() => live.streams.length).toBe(1);
    expect(live.streams[0].searchParams.get("since")).toBe("55");

    await arrive(page, { comments: [{ id: 601, body: "접힌 스레드에 온 새 댓글" }] });
    live.send(sse("changed", { items: [{ kind: "comment", id: 601 }], more: false, cursor: "601" }, "601"));

    await expect(page.locator("#comment-601")).toContainText("접힌 스레드에 온 새 댓글");
    await expect(tops).toHaveCount(6);
    await expect(tops.last()).toHaveAttribute("data-comment-top", "601");
    await expect(page.getByTestId("comments-show-all")).toBeVisible();
  });

  test("a room note lands on top right away when the reader is at the top", async ({ page }) => {
    const live = await fakeLive(page);
    await page.goto("/ko/blog/rooms/1");
    const notes = page.locator("[data-room-notes]");
    await expect(notes.locator("article[data-note-id]").first()).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => live.streams.length).toBe(1);

    await arrive(page, { room: [{ id: 9991, roomId: 1, body: "맨 위에서 바로 보는 글" }] });
    live.send(sse("changed", { items: [{ kind: "note", id: 9991 }], more: false, cursor: "9991" }, "9991"));

    await expect(notes.locator("article[data-note-id]").first()).toContainText("맨 위에서 바로 보는 글");
    await expect(page.getByTestId("live-line")).toHaveCount(0);
  });
});
