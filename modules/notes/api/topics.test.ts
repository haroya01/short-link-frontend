import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/blog/api/public-posts", () => ({ fetchPublic: vi.fn() }));

const TOPICS = "/api/v1/federation/topics";
const POSTS = "/api/v1/federation/topics/posts";

const tag = {
  id: "tag:첫눈",
  kind: "tag",
  tag: "첫눈",
  url: null,
  title: null,
  source: null,
  image: null,
  language: "ko",
  own: true,
  people: 24,
  servers: ["moim.example"],
  related: [],
};

const link = {
  id: "link:https://news.example/a",
  kind: "link",
  tag: null,
  url: "https://news.example/a",
  title: "동네 도서관, 평일 밤 10시까지",
  source: "새벽일보",
  image: null,
  language: "ko",
  own: false,
  people: 14,
  servers: ["moim.example"],
  related: [],
};

const pooled = {
  id: null,
  body: "눈 온다 #첫눈",
  author: { id: null, username: "sora@moim.example", avatarUrl: null, remoteId: null },
  uri: "https://moim.example/users/sora/statuses/1",
  url: "https://moim.example/@sora/1",
  sourceHost: "moim.example",
  servers: ["moim.example"],
};

const kept = { id: 12, body: "첫눈 온 날 #첫눈", uri: "https://kurl.example/notes/12" };

let calls: string[] = [];

function serve(status: number, body?: unknown) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/auth/refresh")) return new Response("", { status: 401 });
      return new Response(body === undefined ? "" : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

async function api() {
  vi.resetModules();
  return import("./topics");
}

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("topics", () => {
  it("asks for twenty by default and for forty when told", async () => {
    serve(200, { items: [tag, link] });
    const { listTopics, TOPICS_FULL_LIMIT } = await api();
    await expect(listTopics()).resolves.toHaveLength(2);
    await listTopics(TOPICS_FULL_LIMIT);
    expect(calls).toEqual([`${TOPICS}?limit=20`, `${TOPICS}?limit=40`]);
  });

  it("reads a tag topic and a link topic", async () => {
    serve(200, { items: [tag, link] });
    const { listTopics } = await api();
    await expect(listTopics()).resolves.toEqual([
      { id: "tag:첫눈", kind: "tag", tag: "첫눈", language: "ko", own: true, people: 24, related: [] },
      {
        id: "link:https://news.example/a",
        kind: "link",
        url: "https://news.example/a",
        title: "동네 도서관, 평일 밤 10시까지",
        source: "새벽일보",
        language: "ko",
        own: false,
        people: 14,
      },
    ]);
  });

  it("skips a kind it does not know, a tag without a name and a link that is not https", async () => {
    const { decodeTopics } = await api();
    const rows = decodeTopics([
      { ...tag, id: "poll:1", kind: "poll" },
      { ...tag, id: "tag:", tag: " " },
      { ...link, id: "link:http://news.example/a", url: "http://news.example/a" },
      { ...link, id: "link:x", url: "javascript:alert(1)" },
      null,
      "x",
      link,
    ]);
    expect(rows.map((row) => row.id)).toEqual(["link:https://news.example/a"]);
    expect(decodeTopics(undefined)).toEqual([]);
  });

  it("draws a topic the server sent twice once", async () => {
    const { decodeTopics } = await api();
    expect(decodeTopics([tag, link, { ...tag, people: 3 }]).map((row) => row.id)).toEqual([tag.id, link.id]);
  });

  it("keeps at most three related articles, https with a title only", async () => {
    const { decodeTopic } = await api();
    const article = (n: number, url = `https://news.example/${n}`) => ({ url, title: `기사 ${n}`, source: "새벽일보", image: null });
    const topic = decodeTopic({
      ...tag,
      related: [
        article(1, "http://news.example/1"),
        { ...article(2), title: "" },
        article(3),
        { ...article(4), source: null },
        article(5),
        article(6),
      ],
    });
    expect(topic).toMatchObject({
      kind: "tag",
      related: [
        { url: "https://news.example/3", title: "기사 3", source: "새벽일보" },
        { url: "https://news.example/4", title: "기사 4", source: null },
        { url: "https://news.example/5", title: "기사 5", source: "새벽일보" },
      ],
    });
  });

  it("treats a missing language, people or own as unknown, zero and not own", async () => {
    const { decodeTopic } = await api();
    expect(decodeTopic({ kind: "tag", tag: "#Suica" })).toEqual({
      id: "tag:suica",
      kind: "tag",
      tag: "Suica",
      language: null,
      own: false,
      people: 0,
      related: [],
    });
  });

  it("reads a blank source or title as none", async () => {
    const { decodeTopic } = await api();
    expect(decodeTopic({ ...link, source: " ", title: "" })).toMatchObject({ kind: "link", source: null, title: null });
  });

  it("fails when the server does not have the endpoint", async () => {
    serve(404, { status: 404, title: "Not Found" });
    const { listTopics } = await api();
    await expect(listTopics()).rejects.toMatchObject({ status: 404 });
  });
});

describe("a topic's posts", () => {
  it("asks by tag, and by url with the address encoded", async () => {
    serve(200, { topic: null, items: [], next: null });
    const { listTopicPosts } = await api();
    await listTopicPosts({ tag: "첫눈" });
    await listTopicPosts({ url: "https://news.example/a?b=1&c=2" });
    expect(calls).toEqual([
      `${POSTS}?tag=${encodeURIComponent("첫눈")}&limit=20`,
      `${POSTS}?url=${encodeURIComponent("https://news.example/a?b=1&c=2")}&limit=20`,
    ]);
  });

  it("follows the cursor it was given", async () => {
    serve(200, { topic: tag, items: [], next: null });
    const { listTopicPosts } = await api();
    await expect(listTopicPosts({ tag: "첫눈" }, "t20")).resolves.toMatchObject({ next: null });
    await listTopicPosts({ tag: "첫눈" }, "r412");
    expect(calls).toEqual([
      `${POSTS}?tag=${encodeURIComponent("첫눈")}&limit=20&cursor=t20`,
      `${POSTS}?tag=${encodeURIComponent("첫눈")}&limit=20&cursor=r412`,
    ]);
  });

  it("returns kept notes and other servers' posts in the order they came, with the topic and the next cursor", async () => {
    serve(200, { topic: tag, items: [pooled, kept, { id: null }], next: "t20" });
    const { listTopicPosts } = await api();
    await expect(listTopicPosts({ tag: "첫눈" })).resolves.toEqual({
      topic: { id: "tag:첫눈", kind: "tag", tag: "첫눈", language: "ko", own: true, people: 24, related: [] },
      items: [
        { kind: "pool", item: pooled },
        { kind: "kept", note: kept, uri: kept.uri },
      ],
      next: "t20",
    });
  });

  it("reads a tag that is not a topic as kept notes alone, and an empty next as the end", async () => {
    serve(200, { topic: null, items: [kept], next: "" });
    const { listTopicPosts } = await api();
    await expect(listTopicPosts({ tag: "kurl" })).resolves.toEqual({
      topic: null,
      items: [{ kind: "kept", note: kept, uri: kept.uri }],
      next: null,
    });
  });
});
