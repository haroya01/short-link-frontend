import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicFeedItem, PublicPostListItem } from "@/modules/blog/api/public-posts";
import { FeedCard, FeedList } from "./feed-card";
import { PostLedger } from "./post-ledger";
import { OwnerAudienceMarks } from "./audience-mark";

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string) => (ns ? `${ns}.${key}` : key),
}));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ href, children, ...rest }: any) => createElement("a", { href, ...rest }, children),
}));
vi.mock("@/modules/blog/components/feed-card-bookmark", () => ({
  FeedCardBookmark: ({ removeOnly }: { removeOnly?: boolean }) =>
    createElement("button", { type: "button", "data-testid": "bookmark", "data-remove-only": String(Boolean(removeOnly)) }),
}));
vi.mock("@/modules/blog/components/post-belonging-line", () => ({ PostBelongingLine: () => null }));
vi.mock("@/modules/blog/components/post-belonging-context", () => ({ BelongingProvider: ({ children }: any) => children }));

const feedItem: PublicFeedItem = {
  id: 902,
  author: { id: 17, username: "hana", bio: null, avatarUrl: null },
  slug: "letters",
  title: "팔로워에게만 쓰는 근황",
  excerpt: null,
  ogImageUrl: null,
  thumbnailUrl: null,
  languageTag: "ko",
  tags: [],
  publishedAt: "2026-05-14T09:00:00Z",
  viewCount: 0,
  likeCount: 0,
};

const listItem = (over: Partial<PublicPostListItem>): PublicPostListItem => ({
  id: 1,
  slug: "s",
  title: "글",
  excerpt: null,
  ogImageUrl: null,
  languageTag: "ko",
  tags: [],
  likeCount: 0,
  publishedAt: "2026-05-14T09:00:00Z",
  lastEditedAt: null,
  pinned: false,
  ...over,
});

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  window.localStorage.clear();
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

async function render(node: React.ReactElement) {
  await act(async () => root.render(node));
}

const marks = () =>
  [...host.querySelectorAll<HTMLElement>("[data-audience-mark]")].map((m) => ({
    mark: m.dataset.audienceMark,
    label: m.getAttribute("aria-label"),
    title: m.getAttribute("title"),
    role: m.getAttribute("role"),
    text: m.textContent,
  }));

describe("a locked post in a list", () => {
  it("shows its title with one mark that replaces the words, and lets a saved one only be removed", async () => {
    await render(
      createElement(
        FeedList,
        null,
        createElement(FeedCard, {
          item: { ...feedItem, audience: "FOLLOWERS", locked: { reason: "FOLLOWERS" } },
          locale: "ko",
          showBookmark: true,
        }),
      ),
    );
    expect(host.textContent).toContain("팔로워에게만 쓰는 근황");
    expect(marks()).toEqual([
      { mark: "FOLLOWERS", label: "publicPost.audience.FOLLOWERS", title: "publicPost.audience.FOLLOWERS", role: "img", text: "" },
    ]);
    expect(host.querySelector('[data-testid="bookmark"]')?.getAttribute("data-remove-only")).toBe("true");
    expect(host.querySelector("img")).toBeNull();
  });

  it("marks a country-limited post as such and keeps it saveable", async () => {
    await render(
      createElement(FeedList, null, createElement(FeedCard, { item: { ...feedItem, regionRestricted: true }, locale: "ko", showBookmark: true })),
    );
    expect(marks().map((m) => m.mark)).toEqual(["REGION"]);
    expect(host.querySelector('[data-testid="bookmark"]')?.getAttribute("data-remove-only")).toBe("false");
  });

  it("leaves a public card unmarked", async () => {
    await render(createElement(FeedList, null, createElement(FeedCard, { item: { ...feedItem, tags: ["일상"] }, locale: "ko" })));
    expect(marks()).toEqual([]);
  });

  it("marks the author's archive rows the same way", async () => {
    await render(
      createElement(PostLedger, {
        username: "hana",
        locale: "ko",
        posts: [
          listItem({ id: 1, title: "공개", audience: "PUBLIC" }),
          listItem({ id: 2, title: "팔로워", audience: "FOLLOWERS", locked: { reason: "FOLLOWERS" } }),
          listItem({ id: 3, title: "비밀", audience: "PASSWORD", locked: { reason: "PASSWORD" } }),
          listItem({ id: 4, title: "나라", regionRestricted: true }),
        ],
      }),
    );
    expect(marks().map((m) => m.mark)).toEqual(["FOLLOWERS", "PASSWORD", "REGION"]);
  });
});

describe("the owner's own rows", () => {
  it("show the audience and the country limit as two marks, nothing for a plain public post", async () => {
    await render(createElement(OwnerAudienceMarks, { audience: "UNLISTED", blockedCountries: ["CN"] }));
    expect(marks().map((m) => m.mark)).toEqual(["UNLISTED", "REGION"]);
    await render(createElement(OwnerAudienceMarks, { audience: "PUBLIC", blockedCountries: [] }));
    expect(marks()).toEqual([]);
  });
});
