import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/blog/api/public-posts", () => ({ fetchPublic: vi.fn() }));

type Reply = { status: number; body?: unknown } | Error;

const mina = {
  id: 9800,
  acct: "mina@mastodon.social",
  username: "mina",
  domain: "mastodon.social",
  displayName: "Mina",
  avatarUrl: null,
  url: "https://mastodon.social/@mina",
  following: false,
  requested: false,
};

const remoteNote = {
  id: 12,
  body: "Hello from the fediverse",
  author: { id: -9800, username: "mina@mastodon.social", avatarUrl: null, remoteId: 9800 },
};

let calls: string[] = [];

function serve(routes: Record<string, Reply>) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      const path = url.split("?")[0];
      const reply = routes[path] ?? (path.endsWith("/auth/refresh") ? { status: 401 } : { status: 599 });
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
  return import("./federation-search");
}

const SEARCH = "/api/v1/federation/accounts/search";
const RESOLVE = "/api/v1/federation/resolve";
const LOOKUP = "/api/v1/federation/accounts/lookup";

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("searching known accounts on other servers", () => {
  it("asks with the name and the limit and returns the accounts", async () => {
    serve({ [SEARCH]: { status: 200, body: { items: [mina] } } });
    const { searchRemoteAccounts } = await api();
    await expect(searchRemoteAccounts(" @mina ", 5)).resolves.toEqual([mina]);
    const asked = new URL(calls[0], "http://x");
    expect(asked.pathname).toBe(SEARCH);
    expect(asked.searchParams.get("q")).toBe("mina");
    expect(asked.searchParams.get("limit")).toBe("5");
  });

  it("does not ask for a single letter", async () => {
    serve({});
    const { searchRemoteAccounts } = await api();
    await expect(searchRemoteAccounts("@m")).resolves.toEqual([]);
    expect(calls).toEqual([]);
  });

  it.each<[string, Reply]>([
    ["a backend without the route, signed in (it reads 'search' as an account id)", { status: 400, body: { code: "INVALID_ARGUMENT" } }],
    ["a backend without the route, signed out", { status: 401 }],
    ["a missing route", { status: 404, body: { code: "NOT_FOUND" } }],
    ["a server error", { status: 500 }],
    ["a network failure", new TypeError("Failed to fetch")],
    ["an answer under another key", { status: 200, body: { accounts: [mina] } }],
  ])("hides the section on %s", async (_, reply) => {
    serve({ [SEARCH]: reply });
    const { searchRemoteAccounts } = await api();
    await expect(searchRemoteAccounts("mina")).resolves.toBeNull();
  });
});

describe("resolving a handle or an address", () => {
  it("returns the account a handle names", async () => {
    serve({ [RESOLVE]: { status: 200, body: { account: mina, note: null } } });
    const { resolveRemote } = await api();
    await expect(resolveRemote("@mina@mastodon.social")).resolves.toEqual({ state: "account", account: mina });
    expect(new URL(calls[0], "http://x").searchParams.get("q")).toBe("@mina@mastodon.social");
  });

  it("returns the note an address names", async () => {
    serve({ [RESOLVE]: { status: 200, body: { account: null, note: remoteNote } } });
    const { resolveRemote } = await api();
    await expect(resolveRemote("https://mastodon.social/@mina/12")).resolves.toEqual({
      state: "note",
      note: remoteNote,
    });
  });

  it("names the server that answered without the account", async () => {
    serve({ [RESOLVE]: { status: 404, body: { code: "REMOTE_ACCOUNT_NOT_FOUND" } } });
    const { resolveRemote } = await api();
    await expect(resolveRemote("@nobody@mastodon.social")).resolves.toEqual({
      state: "missing",
      domain: "mastodon.social",
    });
    expect(calls.some((url) => url.includes(LOOKUP))).toBe(false);
  });

  it("names the server that did not answer", async () => {
    serve({ [RESOLVE]: { status: 502, body: { code: "REMOTE_SERVER_UNREACHABLE" } } });
    const { resolveRemote } = await api();
    await expect(resolveRemote("https://down.example/@mina")).resolves.toEqual({
      state: "unreachable",
      domain: "down.example",
    });
  });

  it("asks a signed-out reader to sign in", async () => {
    serve({ [RESOLVE]: { status: 401 } });
    const { resolveRemote } = await api();
    await expect(resolveRemote("@mina@mastodon.social")).resolves.toEqual({ state: "signin" });
  });

  it("falls back to the account lookup for a handle when the backend has no resolve route", async () => {
    serve({
      [RESOLVE]: { status: 404, body: { code: "NOT_FOUND" } },
      [LOOKUP]: { status: 200, body: mina },
    });
    const { resolveRemote } = await api();
    await expect(resolveRemote("@mina@mastodon.social")).resolves.toEqual({ state: "account", account: mina });
    expect(new URL(calls.find((url) => url.includes(LOOKUP))!, "http://x").searchParams.get("acct")).toBe(
      "@mina@mastodon.social",
    );
  });

  it("keeps the lookup's not-found when it falls back", async () => {
    serve({
      [RESOLVE]: { status: 404, body: { code: "NOT_FOUND" } },
      [LOOKUP]: { status: 404, body: { code: "REMOTE_ACCOUNT_NOT_FOUND" } },
    });
    const { resolveRemote } = await api();
    await expect(resolveRemote("@nobody@mastodon.social")).resolves.toEqual({
      state: "missing",
      domain: "mastodon.social",
    });
  });

  it.each<[string, Reply]>([
    ["a missing route", { status: 404, body: { code: "NOT_FOUND" } }],
    ["a network failure", new TypeError("Failed to fetch")],
    ["a server error", { status: 500 }],
  ])("hides an address on %s", async (_, reply) => {
    serve({ [RESOLVE]: reply });
    const { resolveRemote } = await api();
    await expect(resolveRemote("https://mastodon.social/@mina/12")).resolves.toEqual({ state: "hidden" });
    expect(calls.some((url) => url.includes(LOOKUP))).toBe(false);
  });

  it("hides a handle when the network fails", async () => {
    serve({ [RESOLVE]: new TypeError("Failed to fetch") });
    const { resolveRemote } = await api();
    await expect(resolveRemote("@mina@mastodon.social")).resolves.toEqual({ state: "hidden" });
  });

  it("does not ask about a plain name", async () => {
    serve({});
    const { resolveRemote } = await api();
    await expect(resolveRemote("mina")).resolves.toEqual({ state: "hidden" });
    expect(calls).toEqual([]);
  });
});
