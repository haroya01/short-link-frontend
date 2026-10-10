import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}(${Object.values(values).join(",")})` : key,
}));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href, ...rest }, children),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/ko/p/dohyun", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ me: null }) }));
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T,>(fn: T) => fn }));

import { MediaCell } from "./author-media";
import { ReplyContext } from "./author-replies";
import { activeKeyForPath, visibleAuthorTabs } from "@/app/[locale]/p/[username]/_components/author-tabs";
import type { ProfileMediaItem } from "@/modules/notes/api/notes";

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
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

const render = (node: React.ReactNode) => act(async () => root.render(node));

describe("the replies tab's context line", () => {
  it("names whom it answered with the excerpt, and only that line links to the parent", async () => {
    await render(
      <ReplyContext replyingTo={{ id: 3, author: { id: 15, username: "yuna", avatarUrl: null }, excerpt: "오늘 쓴 글의 씨앗", contentWarning: null }} />,
    );
    const link = host.querySelector("a")!;
    expect(link.getAttribute("href")).toMatch(/yuna.*\/notes\/3$/);
    expect(link.textContent).toBe("replyingToAuthor(yuna) · 오늘 쓴 글의 씨앗");
  });

  it("drops the excerpt when the parent is behind a warning", async () => {
    await render(
      <ReplyContext replyingTo={{ id: 7, author: { id: 15, username: "yuna", avatarUrl: null }, excerpt: null, contentWarning: "결말" }} />,
    );
    expect(host.querySelector("a")!.textContent).toBe("replyingToAuthor(yuna)");
  });

  it("says the original can't be seen, without a link, when the parent is gone or hidden", async () => {
    await render(<ReplyContext replyingTo={null} />);
    expect(host.querySelector("a")).toBeNull();
    expect(host.textContent).toBe("replyParentGone");
  });
});

describe("a media grid cell", () => {
  const item = (over: Partial<ProfileMediaItem> = {}): ProfileMediaItem => ({
    noteId: 5,
    createdAt: "2026-10-05T10:30:00Z",
    media: { url: "https://example.com/a.jpg", altText: "가로등", contentType: "image/jpeg", width: 600, height: 800 },
    mediaCount: 1,
    sensitive: false,
    contentWarning: null,
    ...over,
  });

  it("opens the note and names the picture", async () => {
    await render(<MediaCell item={item()} username="yuna" />);
    const link = host.querySelector("a")!;
    expect(link.getAttribute("href")).toMatch(/yuna.*\/notes\/5$/);
    expect(link.getAttribute("aria-label")).toBe("가로등");
    expect(host.querySelector("[data-media-count]")).toBeNull();
    expect(host.querySelector("img")!.className).not.toContain("blur");
  });

  it("shows a count badge only when the note has more than one picture", async () => {
    await render(<MediaCell item={item({ mediaCount: 3, media: { ...item().media, altText: null } })} username="yuna" />);
    expect(host.querySelector("[data-media-count]")!.textContent).toBe("3");
    expect(host.querySelector("a")!.getAttribute("aria-label")).toBe("mediaNoAlt, mediaCount(3)");
  });

  it("blurs a sensitive picture behind an eye-off mark", async () => {
    await render(<MediaCell item={item({ sensitive: true })} username="yuna" />);
    expect(host.querySelector("img")!.className).toContain("blur-xl");
    expect(host.querySelector("a")!.dataset.sensitive).toBe("true");
    expect(host.querySelector("a")!.getAttribute("aria-label")).toBe("가로등, mediaSensitive");
    expect(host.querySelector("svg.lucide-eye-off")).not.toBeNull();
  });
});

describe("the profile tab row", () => {
  const tabs = [
    { key: "posts", href: "/p", label: "글" },
    { key: "notes", href: "/p/notes", label: "노트" },
    { key: "replies", href: "/p/replies", label: "답글" },
    { key: "media", href: "/p/media", label: "미디어" },
    { key: "reposts", href: "/p/reposts", label: "리포스트" },
    { key: "series", href: "/p/series", label: "시리즈", empty: true },
    { key: "collections", href: "/p/collections", label: "컬렉션", empty: false },
    { key: "about", href: "/p/about", label: "소개" },
  ];

  it("finds the replies and media tabs from the path", () => {
    expect(activeKeyForPath("/ko/p/yuna/replies")).toBe("replies");
    expect(activeKeyForPath("/ko/p/yuna/media/")).toBe("media");
    expect(activeKeyForPath("/ko/p/yuna")).toBe("posts");
  });

  it("hides an empty series or collections tab unless it is the open one", () => {
    expect(visibleAuthorTabs(tabs, "posts", false).map((t) => t.key)).toEqual([
      "posts",
      "notes",
      "replies",
      "media",
      "reposts",
      "collections",
      "about",
    ]);
    expect(visibleAuthorTabs(tabs, "series", false).map((t) => t.key)).toContain("series");
  });
});
