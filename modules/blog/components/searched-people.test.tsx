import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ searchPeople: vi.fn(), blocked: new Set<string>() }));
vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: (namespace: string) => (key: string, values?: { q?: string }) =>
    values?.q != null ? `${namespace}.${key}:${values.q}` : `${namespace}.${key}`,
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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.blocked = new Set();
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

  it("says nobody matched, naming the query", async () => {
    mocks.searchPeople.mockResolvedValue({ items: [], page: 0, size: 20, hasNext: false });
    await show("zz");
    expect(host.textContent).toContain("publicFeed.searchPeopleEmpty:zz");
  });

  it("tells a failed search apart from nobody", async () => {
    mocks.searchPeople.mockRejectedValue(new Error("down"));
    await show("zz");
    expect(host.textContent).toContain("publicFeed.searchFailed");
    expect(host.textContent).not.toContain("searchPeopleEmpty");
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
