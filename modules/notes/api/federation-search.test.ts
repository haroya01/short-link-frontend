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
      if (reply instanceof Error || reply instanceof DOMException) throw reply;
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
const DOMAINS = "/api/v1/federation/domains";

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

  it("waits 20 seconds for resolve while other calls keep the 8-second ceiling", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    serve({
      [RESOLVE]: { status: 200, body: { account: mina, note: null } },
      [SEARCH]: { status: 200, body: { items: [] } },
    });
    const { resolveRemote, searchRemoteAccounts } = await api();
    await resolveRemote("@mina@mastodon.social");
    expect(timeout).toHaveBeenLastCalledWith(20_000);
    await searchRemoteAccounts("mina");
    expect(timeout).toHaveBeenLastCalledWith(8000);
    timeout.mockRestore();
  });

  it("calls the server unresponsive once the client gives up waiting", async () => {
    serve({ [RESOLVE]: new DOMException("signal timed out", "TimeoutError") });
    const { resolveRemote } = await api();
    await expect(resolveRemote("@mina@slow.example")).resolves.toEqual({
      state: "unreachable",
      domain: "slow.example",
    });
  });

  it("does not ask about a plain name", async () => {
    serve({});
    const { resolveRemote } = await api();
    await expect(resolveRemote("mina")).resolves.toEqual({ state: "hidden" });
    expect(calls).toEqual([]);
  });

  it("asks with the handle cleaned of a full-width ＠ and an acct: prefix", async () => {
    serve({ [RESOLVE]: { status: 200, body: { account: mina, note: null } } });
    const { resolveRemote } = await api();
    await expect(resolveRemote(" acct:＠mina＠mastodon.social ")).resolves.toEqual({ state: "account", account: mina });
    expect(new URL(calls[0], "http://x").searchParams.get("q")).toBe("@mina@mastodon.social");
  });

  it("lets a cancelled question fail instead of calling the server unresponsive", async () => {
    serve({ [RESOLVE]: new DOMException("aborted", "AbortError") });
    const { resolveRemote } = await api();
    const controller = new AbortController();
    controller.abort();
    await expect(resolveRemote("@mina@mastodon.social", { signal: controller.signal })).rejects.toBeTruthy();
  });

  it("keeps the 20-second ceiling alongside the caller's signal", async () => {
    const timer = vi.spyOn(globalThis, "setTimeout");
    serve({ [RESOLVE]: { status: 200, body: { account: mina, note: null } } });
    const { resolveRemote } = await api();
    await resolveRemote("@mina@mastodon.social", { signal: new AbortController().signal });
    expect(timer.mock.calls.some(([, ms]) => ms === 20_000)).toBe(true);
    timer.mockRestore();
  });
});

describe("completing the server of a handle", () => {
  it("asks for five servers starting with what was typed, lower-cased", async () => {
    serve({ [DOMAINS]: { status: 200, body: { items: [{ domain: "mastodon.social" }, { domain: "Mastodon.Online" }] } } });
    const { suggestRemoteDomains } = await api();
    await expect(suggestRemoteDomains("mast")).resolves.toEqual(["mastodon.social", "mastodon.online"]);
    const url = new URL(calls[0], "http://x");
    expect(url.searchParams.get("prefix")).toBe("mast");
    expect(url.searchParams.get("limit")).toBe("5");
  });

  it("is null when the backend fails or lacks the route, so the resolve is not held", async () => {
    serve({ [DOMAINS]: { status: 404, body: { code: "NOT_FOUND" } } });
    const { suggestRemoteDomains } = await api();
    await expect(suggestRemoteDomains("mast")).resolves.toBeNull();
  });

  it("lets a cancelled request fail", async () => {
    serve({ [DOMAINS]: new DOMException("aborted", "AbortError") });
    const { suggestRemoteDomains } = await api();
    const controller = new AbortController();
    controller.abort();
    await expect(suggestRemoteDomains("mast", { signal: controller.signal })).rejects.toBeTruthy();
  });
});
