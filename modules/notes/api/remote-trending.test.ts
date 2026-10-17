import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/blog/api/public-posts", () => ({ fetchPublic: vi.fn() }));

const TRENDING = "/api/v1/federation/trending";

const item = {
  id: null,
  body: "서울 불꽃축제 사진 몇 장 올려요.",
  author: { id: null, username: "minji@qdon.space", avatarUrl: null, remoteId: null },
  uri: "https://qdon.space/users/minji/statuses/113000000000000001",
  url: "https://qdon.space/@minji/113000000000000001",
  sourceHost: "qdon.space",
  servers: ["qdon.space", "planet.moe"],
};

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
  return import("./remote-trending");
}

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("trending posts from other servers", () => {
  it("asks for twenty by default and returns the items as they came", async () => {
    serve(200, { items: [item] });
    const { listRemoteTrending } = await api();
    await expect(listRemoteTrending()).resolves.toEqual([item]);
    expect(calls).toEqual([`${TRENDING}?limit=20`]);
  });

  it("passes another limit through", async () => {
    serve(200, { items: [] });
    const { listRemoteTrending } = await api();
    await expect(listRemoteTrending(40)).resolves.toEqual([]);
    expect(calls).toEqual([`${TRENDING}?limit=40`]);
  });

  it("reads a body without a list as nothing trending", async () => {
    serve(200, {});
    const { listRemoteTrending } = await api();
    await expect(listRemoteTrending()).resolves.toEqual([]);
  });

  it("throws when the server fails, so the group can say so", async () => {
    serve(500, { status: 500, title: "Internal Server Error" });
    const { listRemoteTrending } = await api();
    await expect(listRemoteTrending()).rejects.toMatchObject({ status: 500 });
  });
});
