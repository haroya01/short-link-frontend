import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ searchPeople: vi.fn(), searchRemoteAccounts: vi.fn() }));
vi.mock("@/modules/blog/api/people", async (original) => ({
  ...(await original<typeof import("@/modules/blog/api/people")>()),
  searchPeople: mocks.searchPeople,
}));
vi.mock("@/modules/notes/api/federation-search", () => ({ searchRemoteAccounts: mocks.searchRemoteAccounts }));

import { remoteSearchHintVisible, useLivePeople } from "./use-live-people";

let root: Root;
let host: HTMLDivElement;
let people: ReturnType<typeof useLivePeople>["people"];
let remote: ReturnType<typeof useLivePeople>["remote"];
let remoteAnswered: boolean;

function Probe({ query }: { query: string }) {
  ({ people, remote, remoteAnswered } = useLivePeople(query, true, 3));
  return null;
}

const elsewhere = (acct: string, extra: Record<string, boolean> = {}) => {
  const [username, domain] = acct.split("@");
  return {
    id: acct.length,
    acct,
    username,
    domain,
    displayName: null,
    avatarUrl: null,
    url: `https://${domain}/@${username}`,
    following: false,
    requested: false,
    ...extra,
  };
};

const person = (username: string) => ({
  username,
  displayName: null,
  avatarUrl: null,
  bio: null,
  followerCount: 0,
  following: false,
  requested: false,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.searchPeople.mockResolvedValue({ items: [], page: 0, size: 3, hasNext: false });
  mocks.searchRemoteAccounts.mockResolvedValue([]);
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function type(query: string) {
  await act(async () => root.render(<Probe query={query} />));
  await act(async () => vi.advanceTimersByTimeAsync(250));
}

describe("useLivePeople", () => {
  it("waits for two characters before asking", async () => {
    await type("@m");
    expect(mocks.searchPeople).not.toHaveBeenCalled();
    expect(people).toEqual([]);
  });

  it("shows the first few matches once typing settles", async () => {
    mocks.searchPeople.mockResolvedValue({ items: [person("minji")], page: 0, size: 3, hasNext: false });
    await type("min");
    expect(mocks.searchPeople).toHaveBeenCalledWith("min", 0, 3);
    expect(people.map((p) => p.username)).toEqual(["minji"]);
  });

  it("keeps quiet when the search fails, so the posts below still read", async () => {
    mocks.searchPeople.mockRejectedValue(new Error("down"));
    await type("min");
    expect(people).toEqual([]);
  });
});

describe("people elsewhere while typing", () => {
  it("asks the known accounts on other servers in the same pause, a few of them", async () => {
    mocks.searchRemoteAccounts.mockResolvedValue([elsewhere("mina@mastodon.social")]);
    await type("min");
    expect(mocks.searchRemoteAccounts).toHaveBeenCalledWith("min", 3);
    expect(remote.map((a) => a.acct)).toEqual(["mina@mastodon.social"]);
  });

  it("does not wait for the other servers to show the people here", async () => {
    mocks.searchPeople.mockResolvedValue({ items: [person("minji")], page: 0, size: 3, hasNext: false });
    mocks.searchRemoteAccounts.mockReturnValue(new Promise(() => {}));
    await type("min");
    expect(people.map((p) => p.username)).toEqual(["minji"]);
    expect(remote).toEqual([]);
  });

  it("leaves out accounts the viewer blocked, alone or by their server", async () => {
    mocks.searchRemoteAccounts.mockResolvedValue([
      elsewhere("mina@mastodon.social", { blocking: true }),
      elsewhere("haruto@misskey.io", { domainBlocked: true }),
      elsewhere("min@fosstodon.org", { muting: true }),
    ]);
    await type("min");
    expect(remote.map((a) => a.acct)).toEqual(["min@fosstodon.org"]);
  });

  it("leaves a handle or an address to the resolver instead of the known-account search", async () => {
    await type("@mina@mastodon.social");
    await type("＠mina＠mastodon.social");
    await type("https://mastodon.social/@mina");
    expect(mocks.searchRemoteAccounts).not.toHaveBeenCalled();
    expect(remote).toEqual([]);
  });

  it("shows nothing elsewhere when that search fails or the backend lacks it", async () => {
    mocks.searchRemoteAccounts.mockResolvedValue(null);
    await type("min");
    expect(remote).toEqual([]);
  });
});

describe("whether the other servers answered", () => {
  it("is not answered before typing settles, and answered once the search came back empty", async () => {
    await act(async () => root.render(<Probe query="zz" />));
    expect(remoteAnswered).toBe(false);
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(remoteAnswered).toBe(true);
    expect(remote).toEqual([]);
  });

  it("is not answered when the search failed or the backend lacks it", async () => {
    mocks.searchRemoteAccounts.mockResolvedValue(null);
    await type("zz");
    expect(remoteAnswered).toBe(false);
  });

  it("is not answered for a handle, which the resolver takes instead", async () => {
    await type("zz");
    await type("@mina@mastodon.social");
    expect(remoteAnswered).toBe(false);
  });
});

describe("the hint for finding someone elsewhere", () => {
  const mina = elsewhere("mina@mastodon.social");
  const visible = (over: Partial<Parameters<typeof remoteSearchHintVisible>[0]>) =>
    remoteSearchHintVisible({ query: "zz", answered: true, accounts: [], lookupActive: false, ...over });

  it("shows for a name the other servers answered with nobody", () => {
    expect(visible({})).toBe(true);
  });

  it.each([
    ["the other servers have not answered or failed", { answered: false }],
    ["accounts elsewhere matched", { accounts: [mina] }],
    ["a handle is being looked up", { lookupActive: true }],
    ["the query is a handle", { query: "@mina@mastodon.social" }],
    ["the query is an address", { query: "https://mastodon.social/@mina" }],
    ["the query is too short to search", { query: "z" }],
  ])("stays hidden when %s", (_, over) => {
    expect(visible(over)).toBe(false);
  });
});
