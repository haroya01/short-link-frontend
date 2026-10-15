import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RemoteAccount } from "./notes";

vi.mock("@/modules/blog/api/public-posts", () => ({ fetchPublic: vi.fn() }));

type Reply = { status: number; body?: unknown } | Error;

const mina: RemoteAccount = {
  id: 9800,
  acct: "mina@mastodon.social",
  username: "mina",
  domain: "mastodon.social",
  displayName: "Mina",
  avatarUrl: null,
  url: "https://mastodon.social/@mina",
  following: false,
  requested: false,
  blocking: false,
  muting: false,
};

let calls: { url: string; method: string; body: string | null }[] = [];

function serve(routes: Record<string, Reply>) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      calls.push({ url, method, body: typeof init?.body === "string" ? init.body : null });
      const path = url.split("?")[0];
      const reply =
        routes[`${method} ${path}`] ?? (path.endsWith("/auth/refresh") ? { status: 401 } : { status: 599 });
      if (reply instanceof Error) throw reply;
      return new Response(reply.body === undefined ? "" : JSON.stringify(reply.body), {
        status: reply.status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

async function api() {
  vi.resetModules();
  return import("./remote-safety");
}

const ACCOUNT = "/api/v1/federation/accounts/9800";
const BLOCKS = "/api/v1/federation/blocks";
const MUTES = "/api/v1/federation/mutes";
const SUGGESTIONS = "/api/v1/federation/accounts/suggestions";

const OLD_BACKEND: [string, Reply][] = [
  ["a backend without the route", { status: 404, body: { code: "NOT_FOUND" } }],
  ["a backend that reads the path as an account id", { status: 400, body: { code: "INVALID_ARGUMENT" } }],
  ["a server error", { status: 500 }],
  ["a network failure", new TypeError("Failed to fetch")],
  ["an answer under another key", { status: 200, body: { accounts: [mina] } }],
];

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("blocking and muting one account elsewhere", () => {
  it("blocks with PUT and unblocks with DELETE, returning the account as it now stands", async () => {
    serve({
      [`PUT ${ACCOUNT}/block`]: { status: 200, body: { ...mina, blocking: true } },
      [`DELETE ${ACCOUNT}/block`]: { status: 200, body: mina },
    });
    const { setRemoteBlocked } = await api();
    await expect(setRemoteBlocked(9800, true)).resolves.toMatchObject({ blocking: true });
    await expect(setRemoteBlocked(9800, false)).resolves.toMatchObject({ blocking: false });
    expect(calls.map((c) => `${c.method} ${c.url.split("?")[0]}`)).toEqual([
      `PUT ${ACCOUNT}/block`,
      `DELETE ${ACCOUNT}/block`,
    ]);
  });

  it("mutes with the chosen notifications and seconds, null meaning until undone", async () => {
    serve({
      [`PUT ${ACCOUNT}/mute`]: { status: 200, body: { ...mina, muting: true } },
      [`DELETE ${ACCOUNT}/mute`]: { status: 200, body: mina },
    });
    const { muteRemote, unmuteRemote } = await api();
    await expect(muteRemote(9800, false, 3600)).resolves.toMatchObject({ muting: true });
    await muteRemote(9800, true, null);
    await expect(unmuteRemote(9800)).resolves.toMatchObject({ muting: false });
    expect(calls.map((c) => c.body)).toEqual([
      JSON.stringify({ notifications: false, duration: 3600 }),
      JSON.stringify({ notifications: true, duration: null }),
      null,
    ]);
  });

  it("lets a failure reach the caller so the menu can say so", async () => {
    serve({ [`PUT ${ACCOUNT}/block`]: { status: 500 } });
    const { setRemoteBlocked } = await api();
    await expect(setRemoteBlocked(9800, true)).rejects.toBeTruthy();
  });

  it("knows the account carries block and mute only when the backend sends both", async () => {
    const { knowsRemoteSafety } = await api();
    expect(knowsRemoteSafety(mina)).toBe(true);
    const { blocking: _b, muting: _m, ...old } = mina;
    expect(knowsRemoteSafety(old)).toBe(false);
    expect(knowsRemoteSafety({ ...old, blocking: true })).toBe(false);
  });
});

describe("the lists in settings", () => {
  it("reads blocked accounts elsewhere", async () => {
    serve({ [`GET ${BLOCKS}`]: { status: 200, body: { items: [{ ...mina, blocking: true }] } } });
    const { listRemoteBlocks } = await api();
    await expect(listRemoteBlocks()).resolves.toEqual([{ ...mina, blocking: true }]);
    const asked = new URL(calls[0].url, "http://x");
    expect(asked.searchParams.get("page")).toBe("0");
    expect(asked.searchParams.get("size")).toBe("50");
  });

  it("reads muted accounts elsewhere with their end and notification choice", async () => {
    const mute = { account: { ...mina, muting: true }, expiresAt: "2026-10-16T09:00:00Z", notifications: true };
    serve({ [`GET ${MUTES}`]: { status: 200, body: { items: [mute, { expiresAt: null, notifications: false }] } } });
    const { listRemoteMutes } = await api();
    await expect(listRemoteMutes()).resolves.toEqual([mute]);
  });

  it.each(OLD_BACKEND)("hides the blocked group on %s", async (_, reply) => {
    serve({ [`GET ${BLOCKS}`]: reply });
    const { listRemoteBlocks } = await api();
    await expect(listRemoteBlocks()).resolves.toBeNull();
  });

  it.each(OLD_BACKEND)("hides the muted group on %s", async (_, reply) => {
    serve({ [`GET ${MUTES}`]: reply });
    const { listRemoteMutes } = await api();
    await expect(listRemoteMutes()).resolves.toBeNull();
  });
});

describe("follow suggestions elsewhere", () => {
  it("asks for a few and drops anyone the viewer blocked, alone or by server", async () => {
    serve({
      [`GET ${SUGGESTIONS}`]: {
        status: 200,
        body: {
          items: [
            mina,
            { ...mina, id: 9801, acct: "haruto@misskey.io", blocking: true },
            { ...mina, id: 9802, acct: "sora@fosstodon.org", domainBlocked: true },
          ],
        },
      },
    });
    const { listRemoteSuggestions } = await api();
    await expect(listRemoteSuggestions(3)).resolves.toEqual([mina]);
    expect(new URL(calls[0].url, "http://x").searchParams.get("limit")).toBe("3");
  });

  it.each(OLD_BACKEND)("shows none on %s", async (_, reply) => {
    serve({ [`GET ${SUGGESTIONS}`]: reply });
    const { listRemoteSuggestions } = await api();
    await expect(listRemoteSuggestions()).resolves.toEqual([]);
  });
});
