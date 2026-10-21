import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/blog/api/public-posts", () => ({ fetchPublic: vi.fn() }));

const TRENDING = "/api/v1/federation/trending";
const LATEST = "/api/v1/federation/latest";

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

describe("posts from other servers", () => {
  it("asks for twenty trending by default and returns the page as it came", async () => {
    serve(200, { items: [item], next: "t20" });
    const { listRemoteNotes } = await api();
    await expect(listRemoteNotes("trending")).resolves.toEqual({ items: [{ kind: "pool", item }], next: "t20" });
    expect(calls).toEqual([`${TRENDING}?limit=20`]);
  });

  it("follows the cursor it was given", async () => {
    serve(200, { items: [], next: null });
    const { listRemoteNotes } = await api();
    await expect(listRemoteNotes("trending", "t20")).resolves.toEqual({ items: [], next: null });
    expect(calls).toEqual([`${TRENDING}?limit=20&cursor=t20`]);
  });

  it("reads a page past the trending pool as notes this server keeps", async () => {
    const kept = { id: 12, body: "받은 노트" };
    serve(200, { items: [kept], next: "r12" });
    const { listRemoteNotes } = await api();
    await expect(listRemoteNotes("trending", "r")).resolves.toEqual({ items: [{ kind: "kept", note: kept }], next: "r12" });
    expect(calls).toEqual([`${TRENDING}?limit=20&cursor=r`]);
  });

  it("asks the latest list with its own cursor", async () => {
    serve(200, { items: [item], next: "t40" });
    const { listRemoteNotes } = await api();
    await expect(listRemoteNotes("latest", "t20")).resolves.toEqual({ items: [{ kind: "pool", item }], next: "t40" });
    expect(calls).toEqual([`${LATEST}?limit=20&cursor=t20`]);
  });

  it("reads a body without next as the end, and one without a list as nothing", async () => {
    serve(200, { items: [item] });
    const { listRemoteNotes } = await api();
    await expect(listRemoteNotes("trending")).resolves.toEqual({ items: [{ kind: "pool", item }], next: null });
    serve(200, {});
    await expect(listRemoteNotes("latest")).resolves.toEqual({ items: [], next: null });
  });

  it("reads each latest item by its own shape: an id is a kept note, no id is still in the pool", async () => {
    const kept = { id: 31, body: "저장된 노트", author: { id: -9800, username: "mina@mastodon.social" } };
    serve(200, { items: [kept, item, { ...kept, id: 30 }], next: "r30" });
    const { listRemoteNotes } = await api();
    await expect(listRemoteNotes("latest")).resolves.toEqual({
      items: [
        { kind: "kept", note: kept },
        { kind: "pool", item },
        { kind: "kept", note: { ...kept, id: 30 } },
      ],
      next: "r30",
    });
  });

  it("passes any cursor through as it came, whatever it looks like", async () => {
    serve(200, { items: [], next: "r30" });
    const { listRemoteNotes } = await api();
    await expect(listRemoteNotes("latest", "r30")).resolves.toEqual({ items: [], next: "r30" });
    serve(200, { items: [], next: "opaque/+=" });
    await expect(listRemoteNotes("latest", "opaque/+=")).resolves.toEqual({ items: [], next: "opaque/+=" });
    expect(calls).toEqual([`${LATEST}?limit=20&cursor=opaque%2F%2B%3D`]);
  });

  it("throws when the server fails, so the list can say so", async () => {
    serve(500, { status: 500, title: "Internal Server Error" });
    const { listRemoteNotes } = await api();
    await expect(listRemoteNotes("trending")).rejects.toMatchObject({ status: 500 });
  });
});

describe("decodeRemoteItems", () => {
  it("keeps the order, reads an id as a kept note and drops what is neither", async () => {
    const { decodeRemoteItems } = await api();
    const kept = { id: 7, body: "저장" };
    expect(decodeRemoteItems([item, kept, { id: null }, null, "x"])).toEqual([
      { kind: "pool", item },
      { kind: "kept", note: kept },
    ]);
    expect(decodeRemoteItems(undefined)).toEqual([]);
  });
});
