import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchPeople: vi.fn(),
  searchRemoteAccounts: vi.fn(),
  blocked: new Set<string>(),
}));
vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: (namespace: string) => (key: string, values?: { q?: string }) =>
    values?.q != null ? `${namespace}.${key}:${values.q}` : `${namespace}.${key}`,
}));
vi.mock("@/modules/notes/api/federation-search", async (original) => ({
  ...(await original<typeof import("@/modules/notes/api/federation-search")>()),
  searchRemoteAccounts: mocks.searchRemoteAccounts,
}));
vi.mock("@/modules/notes/api/notes", () => ({ lookupRemoteAccount: vi.fn() }));
vi.mock("@/modules/notes/components/note-card", () => ({ NoteCard: () => null }));
vi.mock("@/modules/notes/components/remote-account", () => ({
  RemoteAccountRow: ({ account }: { account: { acct: string } }) => (
    <span data-testid={`remote-${account.acct}`}>@{account.acct}</span>
  ),
}));
vi.mock("@/modules/blog/api/people", async (original) => ({
  ...(await original<typeof import("@/modules/blog/api/people")>()),
  searchPeople: mocks.searchPeople,
}));
vi.mock("@/modules/blog/lib/user-blocks", () => ({ useBlockedNames: () => mocks.blocked }));
vi.mock("./blog-link", () => ({
  BlogLink: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("./follow-button", () => ({
  FollowButton: (props: { username: string; initialFollowing: boolean; initialRequested: boolean }) => (
    <button data-testid={`follow-${props.username}`}>
      {props.initialFollowing ? "following" : props.initialRequested ? "requested" : "follow"}
    </button>
  ),
}));

import { SearchedPeople } from "./searched-people";

let root: Root;
let host: HTMLDivElement;

const person = (username: string, extra: Partial<Record<string, unknown>> = {}) => ({
  username,
  displayName: null,
  avatarUrl: null,
  bio: null,
  followerCount: 3,
  following: false,
  requested: false,
  ...extra,
});

const remote = (acct: string, extra: Partial<Record<string, unknown>> = {}) => ({
  id: acct.length,
  acct,
  username: acct.split("@")[0],
  domain: acct.split("@")[1],
  displayName: null,
  avatarUrl: null,
  url: `https://${acct.split("@")[1]}/@${acct.split("@")[0]}`,
  following: false,
  requested: false,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.blocked = new Set();
  mocks.searchRemoteAccounts.mockResolvedValue(null);
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function show(query: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <SearchedPeople query={query} />
      </QueryClientProvider>,
    ),
  );
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

describe("people search results", () => {
  it("asks for one more character instead of searching a single letter", async () => {
    await show("@k");
    expect(host.textContent).toContain("publicFeed.searchPeopleHint");
    expect(mocks.searchPeople).not.toHaveBeenCalled();
  });

  it("shows each person with name, handle, bio and their follow state", async () => {
    mocks.searchPeople.mockResolvedValue({
      items: [
        person("haruka", { displayName: "하루카", bio: "책과 산책", requested: true }),
        person("minji", { following: true }),
      ],
      page: 0,
      size: 20,
      hasNext: false,
    });
    await show("ha");
    const haruka = host.querySelector('[data-testid="person-haruka"]')!;
    expect(haruka.textContent).toContain("하루카");
    expect(haruka.textContent).toContain("@haruka");
    expect(haruka.textContent).toContain("책과 산책");
    expect(haruka.querySelector("a")!.getAttribute("href")).toMatch(/haruka/);
    expect(host.querySelector('[data-testid="follow-haruka"]')!.textContent).toBe("requested");
    const minji = host.querySelector('[data-testid="person-minji"]')!;
    expect(minji.textContent).not.toContain("@minji");
    expect(host.querySelector('[data-testid="follow-minji"]')!.textContent).toBe("following");
  });

  it("says nobody matched", async () => {
    mocks.searchPeople.mockResolvedValue({ items: [], page: 0, size: 20, hasNext: false });
    await show("zz");
    expect(host.textContent).toContain("publicFeed.searchNoPeople");
  });

  it("tells a failed search apart from nobody", async () => {
    mocks.searchPeople.mockRejectedValue(new Error("down"));
    await show("zz");
    expect(host.textContent).toContain("publicFeed.searchFailed");
    expect(host.textContent).not.toContain("searchNoPeople");
  });

  it("leaves out someone blocked this session and loads the next page on request", async () => {
    mocks.blocked = new Set(["yuna"]);
    mocks.searchPeople
      .mockResolvedValueOnce({ items: [person("haruka"), person("yuna")], page: 0, size: 20, hasNext: true })
      .mockResolvedValueOnce({ items: [person("hana")], page: 1, size: 20, hasNext: false });
    await show("ha");
    expect(host.querySelector('[data-testid="person-yuna"]')).toBeNull();
    const more = Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "publicFeed.loadMore")!;
    await act(async () => more.click());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(mocks.searchPeople).toHaveBeenLastCalledWith("ha", 1);
    expect(host.querySelector('[data-testid="person-hana"]')).not.toBeNull();
  });
});

describe("people on other servers in the same search", () => {
  const page = (items: unknown[]) => ({ items, page: 0, size: 20, hasNext: false });

  it("lists them under the people here, under their own heading", async () => {
    mocks.searchPeople.mockResolvedValue(page([person("haruka")]));
    mocks.searchRemoteAccounts.mockResolvedValue([remote("haruto@misskey.io")]);
    await show("har");
    expect(mocks.searchRemoteAccounts).toHaveBeenCalledWith("har");
    const order = Array.from(host.querySelectorAll('[data-testid^="person-"], [data-testid^="remote-"]')).map(
      (el) => el.getAttribute("data-testid"),
    );
    expect(order).toEqual(["person-haruka", "remote-people-results", "remote-haruto@misskey.io"]);
    expect(host.textContent).toContain("notes.remoteSection");
    expect(host.textContent).not.toContain("notes.remoteSearchHint");
  });

  it("drops the empty state when only another server matched", async () => {
    mocks.searchPeople.mockResolvedValue(page([]));
    mocks.searchRemoteAccounts.mockResolvedValue([remote("haruto@misskey.io")]);
    await show("haruto");
    expect(host.textContent).not.toContain("publicFeed.searchNoPeople");
    expect(host.querySelector('[data-testid="remote-haruto@misskey.io"]')).not.toBeNull();
  });

  it("leaves out an account on a server the reader blocked", async () => {
    mocks.searchPeople.mockResolvedValue(page([]));
    mocks.searchRemoteAccounts.mockResolvedValue([remote("haruto@misskey.io", { domainBlocked: true })]);
    await show("haruto");
    expect(host.querySelector('[data-testid="remote-haruto@misskey.io"]')).toBeNull();
    expect(host.textContent).toContain("publicFeed.searchNoPeople");
    expect(host.textContent).toContain("notes.remoteSearchHint");
  });

  it("says how to reach someone elsewhere when no other server matched", async () => {
    mocks.searchPeople.mockResolvedValue(page([person("haruka")]));
    mocks.searchRemoteAccounts.mockResolvedValue([]);
    await show("har");
    expect(host.textContent).toContain("notes.remoteSearchHint");
    expect(host.textContent).not.toContain("notes.remoteSection");
  });

  it("stays as it was when the other-server search is not there", async () => {
    mocks.searchPeople.mockResolvedValue(page([]));
    mocks.searchRemoteAccounts.mockResolvedValue(null);
    await show("zz");
    expect(host.textContent).toContain("publicFeed.searchNoPeople");
    expect(host.textContent).not.toContain("notes.remoteSection");
    expect(host.textContent).not.toContain("notes.remoteSearchHint");
  });

  it("leaves a handle to the lookup above and does not list it twice", async () => {
    mocks.searchPeople.mockResolvedValue(page([]));
    await show("@mina@mastodon.social");
    expect(mocks.searchRemoteAccounts).not.toHaveBeenCalled();
    expect(host.textContent).not.toContain("notes.remoteSearchHint");
  });
});
