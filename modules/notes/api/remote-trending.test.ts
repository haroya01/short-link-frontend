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

describe("what the server is told about the viewer", () => {
  const DEVICE = "kurl:device-id";
  const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
  let sent: { url: string; headers: Headers; body: unknown; keepalive?: boolean }[] = [];

  function answer(status: number, body?: unknown) {
    sent = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
        sent.push({
          url: String(input),
          headers: new Headers(init.headers),
          body: typeof init.body === "string" ? JSON.parse(init.body) : init.body,
          keepalive: init.keepalive,
        });
        return new Response(body === undefined ? "" : JSON.stringify(body), { status });
      }),
    );
  }

  it("reads seenFrom against the items it kept", async () => {
    answer(200, { items: [item, null, { ...item, uri: "https://qdon.space/2" }, { ...item, uri: "https://qdon.space/3" }], next: "s1.t2", seenFrom: 3 });
    const { listRemoteNotes } = await api();
    const page = await listRemoteNotes("latest");
    expect(page.seenFrom).toBe(2);
    expect(page.items).toHaveLength(3);
  });

  it("reads seenFrom past the last item as the next page starting seen, and ignores one that is not an index", async () => {
    answer(200, { items: [item], next: "s1.t1", seenFrom: 1 });
    const { listRemoteNotes } = await api();
    await expect(listRemoteNotes("latest")).resolves.toMatchObject({ seenFrom: 1 });
    answer(200, { items: [item], next: null, seenFrom: "1" });
    expect(await listRemoteNotes("latest")).not.toHaveProperty("seenFrom");
    answer(200, { items: [item], next: null, seenFrom: -1 });
    expect(await listRemoteNotes("latest")).not.toHaveProperty("seenFrom");
  });

  it("reads a kept note's uri", async () => {
    const kept = { id: 31, body: "저장된 노트", uri: "https://mastodon.social/users/mina/statuses/31" };
    answer(200, { items: [kept], next: null });
    const { listRemoteNotes } = await api();
    await expect(listRemoteNotes("latest")).resolves.toEqual({
      items: [{ kind: "kept", note: kept, uri: kept.uri }],
      next: null,
    });
  });

  it("a signed-out reader's latest carries one device id that stays, trending never does", async () => {
    answer(200, { items: [], next: null });
    const { listRemoteNotes } = await api();
    await listRemoteNotes("latest");
    const first = sent[0].headers.get("X-Kurl-Device");
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    await listRemoteNotes("latest");
    expect(sent[1].headers.get("X-Kurl-Device")).toBe(first);
    expect(window.localStorage.getItem(DEVICE)).toBe(first);
    await listRemoteNotes("trending");
    expect(sent[2].headers.has("X-Kurl-Device")).toBe(false);
  });

  it("a signed-in reader is known by their token, not the device", async () => {
    window.localStorage.setItem("short-link:access-token", "header.e30.sig");
    window.localStorage.setItem(DEVICE, ID);
    answer(200, { items: [], next: null });
    const { listRemoteNotes } = await api();
    await listRemoteNotes("latest");
    expect(sent[0].headers.get("Authorization")).toBe("Bearer header.e30.sig");
    expect(sent[0].headers.has("X-Kurl-Device")).toBe(false);
  });

  it("an id that is not a UUID is replaced, and storage that throws leaves the header off", async () => {
    window.localStorage.setItem(DEVICE, "not-a-uuid");
    answer(200, { items: [], next: null });
    const { listRemoteNotes } = await api();
    await listRemoteNotes("latest");
    expect(sent[0].headers.get("X-Kurl-Device")).not.toBe("not-a-uuid");
    expect(sent[0].headers.get("X-Kurl-Device")).toBe(window.localStorage.getItem(DEVICE));

    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    await listRemoteNotes("latest");
    expect(sent[1].headers.has("X-Kurl-Device")).toBe(false);
    spy.mockRestore();
  });

  it("posts seen uris with the device id, keepalive when asked", async () => {
    window.localStorage.setItem(DEVICE, ID);
    answer(202);
    const { sendRemoteSeen } = await api();
    await sendRemoteSeen(["https://qdon.space/1", "https://qdon.space/2"], true);
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe("/api/v1/federation/seen");
    expect(sent[0].body).toEqual({ uris: ["https://qdon.space/1", "https://qdon.space/2"] });
    expect(sent[0].headers.get("X-Kurl-Device")).toBe(ID);
    expect(sent[0].keepalive).toBe(true);
  });

  it("sends nothing when there is neither a token nor a device id", async () => {
    vi.stubGlobal("crypto", {});
    answer(202);
    const { sendRemoteSeen } = await api();
    await sendRemoteSeen(["https://qdon.space/1"]);
    expect(sent).toEqual([]);
  });

  it("a failed post throws, so the batch can go again", async () => {
    window.localStorage.setItem(DEVICE, ID);
    answer(503, { status: 503, title: "Service Unavailable" });
    const { sendRemoteSeen } = await api();
    await expect(sendRemoteSeen(["https://qdon.space/1"])).rejects.toMatchObject({ status: 503 });
  });
});
