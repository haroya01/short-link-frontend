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
    await expect(listRemoteNotes("trending")).resolves.toEqual({ kind: "pool", items: [item], next: "t20" });
    expect(calls).toEqual([`${TRENDING}?limit=20`]);
  });

  it("follows the cursor it was given", async () => {
    serve(200, { items: [], next: null });
    const { listRemoteNotes } = await api();
    await expect(listRemoteNotes("trending", "t20")).resolves.toEqual({ kind: "pool", items: [], next: null });
    expect(calls).toEqual([`${TRENDING}?limit=20&cursor=t20`]);
  });

  it("reads a page past the trending pool as notes this server keeps", async () => {
    const kept = { id: 12, body: "받은 노트" };
    serve(200, { items: [kept], next: "r12" });
    const { listRemoteNotes } = await api();
    await expect(listRemoteNotes("trending", "r")).resolves.toEqual({ kind: "kept", items: [kept], next: "r12" });
    expect(calls).toEqual([`${TRENDING}?limit=20&cursor=r`]);
  });

  it("asks the latest list with its own cursor", async () => {
    serve(200, { items: [item], next: "t40" });
    const { listRemoteNotes } = await api();
    await expect(listRemoteNotes("latest", "t20")).resolves.toEqual({ kind: "pool", items: [item], next: "t40" });
    expect(calls).toEqual([`${LATEST}?limit=20&cursor=t20`]);
  });

  it("reads a body without next as the end, and one without a list as nothing", async () => {
    serve(200, { items: [item] });
    const { listRemoteNotes } = await api();
    await expect(listRemoteNotes("trending")).resolves.toEqual({ kind: "pool", items: [item], next: null });
    serve(200, {});
    await expect(listRemoteNotes("latest")).resolves.toEqual({ kind: "pool", items: [], next: null });
  });

  it("throws when the server fails, so the list can say so", async () => {
    serve(500, { status: 500, title: "Internal Server Error" });
    const { listRemoteNotes } = await api();
    await expect(listRemoteNotes("trending")).rejects.toMatchObject({ status: 500 });
  });
});
