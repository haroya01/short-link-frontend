import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";

const mocks = vi.hoisted(() => ({
  auth: { ready: true, me: null as { id: number } | null },
  listPublicFeed: vi.fn(),
  listFeedByTag: vi.fn(),
  searchPublicFeed: vi.fn(),
}));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/lib/api/client", () => ({ request: vi.fn() }));
vi.mock("@/modules/blog/lib/use-tag-prefs", () => ({ useTagPrefs: () => ({ prefs: { hidden: [] } }) }));
vi.mock("@/modules/blog/api/public-posts", () => ({
  listPublicFeed: mocks.listPublicFeed,
  listFeedByTag: mocks.listFeedByTag,
  searchPublicFeed: mocks.searchPublicFeed,
}));
vi.mock("@/modules/blog/components/feed-card", () => ({
  FeedList: ({ children }: { children: React.ReactNode }) => createElement("ul", null, children),
  FeedCard: ({ item }: { item: PublicFeedItem }) => createElement("li", null, `${item.author.username}/${item.slug}`),
}));

const post = (username: string, slug: string) =>
  ({ slug, title: slug, author: { id: 1, username }, tags: [] }) as unknown as PublicFeedItem;
const seed = [post("minji", "pricing"), post("kazuki", "kyoto"), post("sora", "tokens")];

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  mocks.auth.ready = true;
  mocks.auth.me = null;
  vi.stubGlobal("React", React);
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const viewerPage = { ok: true, data: { items: [seed[0], seed[2]], page: 0, size: 24, hasNext: false } };
  mocks.listPublicFeed.mockResolvedValue(viewerPage);
  mocks.listFeedByTag.mockResolvedValue(viewerPage);
  mocks.searchPublicFeed.mockResolvedValue(viewerPage);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

async function mount(props: Record<string, unknown> = {}) {
  const { FeedInfinite } = await import("./feed-infinite");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root.render(
      createElement(FeedInfinite, { locale: "ko", initialItems: seed, initialHasNext: false, sort: "recent", ...props }),
    );
  });
}
const shown = () => Array.from(host.querySelectorAll("li")).map((li) => li.textContent);

describe("the first page of a discovery feed", () => {
  it("stays the server's for a visitor", async () => {
    await mount();
    expect(shown()).toEqual(["minji/pricing", "kazuki/kyoto", "sora/tokens"]);
    expect(mocks.listPublicFeed).not.toHaveBeenCalled();
  });

  it("is fetched again as the signed-in reader's own, leaving out whom the server hides from them", async () => {
    mocks.auth.me = { id: 1 };
    await mount({ sort: "trending", lang: "ko" });
    expect(mocks.listPublicFeed).toHaveBeenCalledWith("trending", 0, 24, "ko");
    expect(shown()).toEqual(["minji/pricing", "sora/tokens"]);
  });

  it("asks for the same tag or search the page shows", async () => {
    mocks.auth.me = { id: 1 };
    await mount({ tag: "일상", sort: "trending" });
    expect(mocks.listFeedByTag).toHaveBeenCalledWith("일상", "trending", 0, 24);
    await act(async () => root.unmount());
    await mount({ query: " 교토 ", sort: "recent" });
    expect(mocks.searchPublicFeed).toHaveBeenCalledWith("교토", "recent", 0, 24, undefined);
  });

  it("waits until it knows who is reading", async () => {
    mocks.auth.ready = false;
    await mount();
    expect(mocks.listPublicFeed).not.toHaveBeenCalled();
    expect(shown()).toHaveLength(3);
  });

  it("never brings back pages another reader loaded", async () => {
    const tail = [post("haruka", "generics")];
    window.sessionStorage.setItem(
      "kurl.feed:ko:recent:::",
      JSON.stringify({ items: [...seed, ...tail], page: 1, hasNext: false, savedAt: Date.now(), viewer: null }),
    );
    mocks.auth.me = { id: 1 };
    await mount();
    expect(shown()).toEqual(["minji/pricing", "sora/tokens"]);

    await act(async () => root.unmount());
    window.sessionStorage.setItem(
      "kurl.feed:ko:recent:::",
      JSON.stringify({ items: [...seed, ...tail], page: 1, hasNext: false, savedAt: Date.now(), viewer: 1 }),
    );
    await mount();
    expect(shown()).toEqual(["minji/pricing", "sora/tokens", "haruka/generics"]);
  });
});
