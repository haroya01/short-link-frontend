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
vi.mock("@/modules/blog/components/feed-card-bookmark", () => ({
  FeedCardBookmark: () => createElement("button", { type: "button", "aria-label": "bookmark", "data-testid": "bookmark" }),
}));
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
  window.localStorage.clear();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

async function render(item: PublicFeedItem, showBookmark = false) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root.render(createElement(FeedList, null, createElement(FeedCard, { item, locale: "ko", showBookmark })));
  });
}

const row = () => host.querySelector<HTMLLIElement>("li[data-feed-row]")!;
const classesIn = (el: Element) => [el, ...el.querySelectorAll("*")].flatMap((n) => [...n.classList]);

describe("FeedCard row grammar", () => {
  it("is a hairline row with no card, rounded container or hover tint", async () => {
    await render({ ...base, ogImageUrl: "https://example.com/cover.png", thumbnailUrl: "https://example.com/cover.png" }, true);
    expect(row().className).toContain("border-b");
    const classes = classesIn(row());
    expect(classes.filter((c) => /^rounded-surface$|^shadow|^bg-white$/.test(c))).toEqual([]);
    expect(classes.filter((c) => /hover:bg-/.test(c) && !/^hover:bg-accent/.test(c))).toEqual([]);
  });

  it("clamps the title to three lines and the excerpt to two", async () => {
    await render(base);
    expect(row().querySelector("h2")!.className).toContain("line-clamp-3");
    expect(row().querySelector("p")!.className).toContain("line-clamp-2");
  });

  it("puts a square thumbnail beside the title and excerpt, never over them", async () => {
    await render({ ...base, ogImageUrl: "https://example.com/cover.png", thumbnailUrl: "https://example.com/cover.png" });
    const thumb = row().querySelector<HTMLAnchorElement>("[data-row-thumb]")!;
    expect(thumb.className).toMatch(/\bh-\[72px\] w-\[72px\]/);
    expect(thumb.className).toMatch(/\bsm:h-24 sm:w-24\b/);
    expect(thumb.className).not.toMatch(/\babsolute\b/);
    const titleLink = row().querySelector("h2")!.closest("a")!;
    expect(thumb.parentElement).toBe(row());
    expect(titleLink.parentElement).toBe(row());
    expect(thumb.className).toMatch(/\bcol-start-2\b/);
    expect(titleLink.className).toMatch(/\bcol-start-1\b/);
    expect(row().querySelector("time")!.parentElement!.contains(thumb)).toBe(false);
  });

  it("renders no thumbnail slot for a post without a cover", async () => {
    await render(base);
    expect(row().querySelector("[data-row-thumb]")).toBeNull();
    expect(row().className).toMatch(/\bgrid-cols-1\b/);
    expect(row().className).not.toMatch(/gap-x/);
  });

  it("keeps a cover the author didn't choose out of the row", async () => {
    await render({ ...base, ogImageUrl: "https://example.com/body-first.png", thumbnailUrl: null });
    expect(row().querySelector("[data-row-thumb]")).toBeNull();
    expect(row().querySelector("img")).toBeNull();
  });

  it("ends the byline with the bookmark glyph", async () => {
    await render(base, true);
    const bookmark = host.querySelector('[data-testid="bookmark"]')!;
    const byline = row().querySelector("time")!.parentElement!;
    expect(byline.contains(bookmark)).toBe(true);
    expect(byline.lastElementChild!.contains(bookmark)).toBe(true);
  });

  it("mutes the title of a post this device finished reading and says so to screen readers", async () => {
    await render(base);
    expect(row().dataset.read).toBeUndefined();
    expect(row().querySelector("h2")!.className).toContain("text-slate-900");
    await act(async () => root.unmount());
    host.remove();

    window.localStorage.setItem("kurl:read-posts", JSON.stringify([base.id]));
    vi.resetModules();
    const fresh = await import("./feed-card");
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root.render(createElement(fresh.FeedList, null, createElement(fresh.FeedCard, { item: base, locale: "ko", showBookmark: false })));
    });
    const title = row().querySelector("h2")!;
    expect(row().dataset.read).toBe("true");
    expect(title.className).toContain("text-slate-500");
    expect(title.querySelector(".sr-only")!.textContent).toBe("rowRead");
  });
});

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
