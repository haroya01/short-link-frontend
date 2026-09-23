import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";
import { FeedCard, FeedList } from "./feed-card";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}(${Object.values(values).join(",")})` : key,
}));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ href, children, ...rest }: any) => createElement("a", { href, ...rest }, children),
}));
vi.mock("@/modules/blog/components/feed-card-bookmark", () => ({ FeedCardBookmark: () => null }));
vi.mock("@/modules/blog/components/post-belonging-line", () => ({ PostBelongingLine: () => null }));
vi.mock("@/modules/blog/components/post-belonging-context", () => ({
  BelongingProvider: ({ children }: any) => children,
}));

const base: PublicFeedItem = {
  id: 7,
  author: { id: 1, username: "dohyun", bio: null, avatarUrl: null },
  slug: "rtt-3",
  title: "RTT (3)",
  excerpt: "latest episode",
  ogImageUrl: null,
  languageTag: "ko",
  tags: ["java"],
  publishedAt: "2026-07-15T09:00:00Z",
  viewCount: 0,
  likeCount: 0,
};

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

async function render(item: PublicFeedItem) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root.render(createElement(FeedList, null, createElement(FeedCard, { item, locale: "ko", showBookmark: false })));
  });
}

describe("FeedCard series line", () => {
  it("links a collapsed series row to its series page with the episode count", async () => {
    await render({ ...base, series: { slug: "rtt", title: "RTT 개선 기록", postCount: 3 } });

    const line = host.querySelector<HTMLAnchorElement>('[data-testid="feed-card-series"]');
    expect(line).not.toBeNull();
    expect(line!.getAttribute("href")).toBe("/ko/p/dohyun/series/rtt");
    expect(line!.textContent).toContain("RTT 개선 기록");
    expect(line!.textContent).toContain("seriesEpisodeCount(3)");
  });

  it("stays hidden for standalone posts and single-episode series", async () => {
    await render({ ...base, series: null });
    expect(host.querySelector('[data-testid="feed-card-series"]')).toBeNull();
    await act(async () => root.unmount());
    host.remove();

    await render({ ...base, series: { slug: "solo", title: "Solo", postCount: 1 } });
    expect(host.querySelector('[data-testid="feed-card-series"]')).toBeNull();
  });

  it("names why a followed topic surfaced the post next to its tag", async () => {
    await render({ ...base, followReason: { kind: "TOPIC", tag: "java" } });
    expect(host.textContent).toContain("feedReasonTopic(java)");

    await act(async () => root.unmount());
    host.remove();
    await render({ ...base, followReason: { kind: "AUTHOR", tag: null } });
    expect(host.textContent).not.toContain("feedReason");
  });
});
