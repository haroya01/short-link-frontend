import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";

const mocks = vi.hoisted(() => ({
  auth: { ready: true, me: { id: 1 } as { id: number } | null },
  listFeedByTag: vi.fn(),
  listPublicPosts: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/modules/blog/api/public-posts", () => ({
  listFeedByTag: mocks.listFeedByTag,
  listPublicPosts: mocks.listPublicPosts,
}));
vi.mock("@/modules/blog/components/rail-heading", () => ({
  RailHeading: ({ children }: { children: React.ReactNode }) => createElement("h2", null, children),
}));
vi.mock("@/modules/blog/components/feed-card", () => ({
  FeedList: ({ children }: { children: React.ReactNode }) => createElement("ul", null, children),
  FeedCard: ({ item }: { item: PublicFeedItem }) => createElement("li", null, `${item.author.username}/${item.slug}`),
}));

const author = { id: 2, username: "minji", bio: null, avatarUrl: null };
const post = (username: string, slug: string) =>
  ({ slug, title: slug, author: { id: 9, username }, tags: ["일상"] }) as unknown as PublicFeedItem;

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.me = { id: 1 };
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

async function mount() {
  const { RelatedPicksList } = await import("./related-picks-list");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root.render(
      createElement(RelatedPicksList, {
        locale: "ko",
        heading: "다음 읽을 글",
        initial: [post("kazuki", "kyoto"), post("sora", "tokens"), post("haruka", "hexagonal")],
        refresh: {
          tag: "일상",
          tagSize: 5,
          author,
          pick: { currentKey: "minji/coffee", currentTitle: "coffee", inSeries: false, count: 3 },
        },
      }),
    );
  });
}
const shown = () => Array.from(host.querySelectorAll("li")).map((li) => li.textContent);

describe("next reads for a signed-in reader", () => {
  it("are picked again from their own tag feed, topped up from the author's posts", async () => {
    mocks.listFeedByTag.mockResolvedValue({
      ok: true,
      data: { items: [post("sora", "tokens"), post("minji", "coffee")], page: 0, size: 5, hasNext: false },
    });
    mocks.listPublicPosts.mockResolvedValue({ ok: true, data: { posts: [{ slug: "pricing", title: "pricing", tags: [] }] } });
    await mount();
    expect(mocks.listFeedByTag).toHaveBeenCalledWith("일상", "recent", 0, 5);
    expect(shown()).toEqual(["sora/tokens", "minji/pricing"]);
  });

  it("stay the server's picks for a visitor", async () => {
    mocks.auth.me = null;
    await mount();
    expect(mocks.listFeedByTag).not.toHaveBeenCalled();
    expect(shown()).toEqual(["kazuki/kyoto", "sora/tokens", "haruka/hexagonal"]);
  });
});
