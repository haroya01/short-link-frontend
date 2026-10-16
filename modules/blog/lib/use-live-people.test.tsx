import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ searchPeople: vi.fn(), searchRemoteAccounts: vi.fn() }));
vi.mock("@/modules/blog/api/people", async (original) => ({
  ...(await original<typeof import("@/modules/blog/api/people")>()),
  searchPeople: mocks.searchPeople,
}));
vi.mock("@/modules/notes/api/federation-search", () => ({ searchRemoteAccounts: mocks.searchRemoteAccounts }));

import { useLivePeople } from "./use-live-people";

let root: Root;
let host: HTMLDivElement;
let people: ReturnType<typeof useLivePeople>["people"];
let remote: ReturnType<typeof useLivePeople>["remote"];

function Probe({ query }: { query: string }) {
  ({ people, remote } = useLivePeople(query, true, 3));
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
