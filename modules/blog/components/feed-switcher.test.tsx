import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FeedSortTab } from "./feed-sort-tabs";

const mocks = vi.hoisted(() => ({
  auth: { ready: true, authenticated: true },
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, replace: mocks.replace }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => createElement("a", { href, ...rest }, children),
}));

import { FeedSwitcher } from "./feed-switcher";

const blogTabs = (active = "for-you"): FeedSortTab[] => [
  { key: "for-you", label: "추천", href: "?sort=for-you", active: active === "for-you" },
  { key: "following", label: "팔로잉", href: "?sort=following", active: active === "following" },
  { key: "blog", label: "블로그", href: "?sort=blog", active: active === "blog" },
];
const blogMore = (active?: string) => [
  { key: "series", label: "시리즈", icon: "series" as const, href: "?sort=series", active: active === "series" },
];

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.ready = true;
  mocks.auth.authenticated = true;
  vi.stubGlobal("React", React);
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    disconnect() {}
  });
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  for (const c of document.cookie.split("; ")) {
    const name = c.split("=")[0];
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

async function render(props: Parameters<typeof FeedSwitcher>[0]) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  host.addEventListener("click", (e) => e.preventDefault());
  await act(async () => root.render(createElement(FeedSwitcher, props)));
}

const tab = (label: string) => [...host.querySelectorAll("nav a")].find((a) => a.textContent === label)!;
const click = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
  });
};

describe("FeedSwitcher", () => {
  it("lays out 추천 · 팔로잉 · 블로그 and keeps 팔로잉 for signed-out visitors", async () => {
    mocks.auth.authenticated = false;
    await render({ surface: "blog", tabs: blogTabs(), more: blogMore() });
    expect([...host.querySelectorAll("nav a")].map((a) => a.textContent)).toEqual(["추천", "팔로잉", "블로그"]);
    expect(host.querySelector("[data-feed-more]")).toBeNull();
  });

  it("offers only the surface's other feeds in 더 보기 once signed in", async () => {
    await render({ surface: "blog", tabs: blogTabs(), more: blogMore() });
    const more = host.querySelector<HTMLButtonElement>("[data-feed-more] button")!;
    expect(more.getAttribute("aria-label")).toBe("feedMoreBlog");
    await click(more);
    expect([...host.querySelectorAll('[role="menuitem"]')].map((a) => a.textContent)).toEqual(["시리즈"]);
  });

  it("switches to a 더 보기 feed in place and moves the selection into the slot at once", async () => {
    await render({ surface: "blog", tabs: blogTabs("for-you"), more: blogMore() });
    expect(tab("추천").getAttribute("data-active")).toBe("true");
    await click(host.querySelector("[data-feed-more] button")!);
    await click([...host.querySelectorAll('[role="menuitem"]')].find((a) => a.textContent === "시리즈")!);
    const slot = host.querySelector<HTMLButtonElement>("[data-feed-more] button")!;
    expect(slot.getAttribute("aria-label")).toBe("feedMoreBlog: 시리즈");
    expect(slot.getAttribute("data-active")).toBe("true");
    expect(host.querySelectorAll('nav a[data-active="true"]')).toHaveLength(0);
    expect(mocks.push).toHaveBeenCalledWith(expect.stringContaining("?sort=series"));
  });

  it("shows the open 더 보기 feed in the slot by its short name, and a tab takes the selection back", async () => {
    const notesTabs = (active: string | null): FeedSortTab[] =>
      ["following", "everyone", "trending"].map((key, i) => ({
        key,
        label: ["팔로잉", "최신", "인기"][i],
        href: `?feed=${key}`,
        active: key === active,
      }));
    const mentions = (active: boolean) => [
      { key: "direct", label: "개인 멘션", shortLabel: "멘션", icon: "mention" as const, href: "?feed=direct", active },
    ];
    await render({ surface: "notes", tabs: notesTabs(null), more: mentions(true) });
    const slot = host.querySelector<HTMLButtonElement>("[data-feed-more] button")!;
    expect(slot.getAttribute("aria-label")).toBe("feedMoreNotes: 개인 멘션");
    expect(slot.textContent).toBe("멘션");
    await click(tab("최신"));
    expect(slot.getAttribute("data-active")).toBeNull();
    await act(async () => root.render(createElement(FeedSwitcher, { surface: "notes", tabs: notesTabs("everyone"), more: mentions(false) })));
    expect(tab("최신").getAttribute("data-active")).toBe("true");
    expect(slot.getAttribute("aria-label")).toBe("feedMoreNotes");
  });

  it("remembers the switcher tab the reader picks, per surface", async () => {
    await render({ surface: "blog", tabs: blogTabs(), more: blogMore() });
    await click(tab("팔로잉"));
    expect(document.cookie).toContain("kurl_blog_default_tab=following");
    expect(document.cookie).not.toContain("kurl_notes_feed");
    expect(mocks.push).toHaveBeenCalledWith(expect.stringContaining("?sort=following"));
  });

  it("never remembers a 더 보기 source", async () => {
    await render({ surface: "blog", tabs: blogTabs("following"), more: blogMore() });
    await click(tab("팔로잉"));
    await click(host.querySelector("[data-feed-more] button")!);
    await click([...host.querySelectorAll('[role="menuitem"]')].find((a) => a.textContent === "시리즈")!);
    expect(document.cookie).toContain("kurl_blog_default_tab=following");
  });

  it("does not save 팔로잉 from a signed-out click", async () => {
    mocks.auth.authenticated = false;
    await render({ surface: "notes", tabs: [
      { key: "following", label: "팔로잉", href: "?feed=following", active: false },
      { key: "everyone", label: "최신", href: "?feed=everyone", active: true },
      { key: "trending", label: "인기", href: "?feed=trending", active: false },
    ] });
    await click(tab("팔로잉"));
    expect(document.cookie).not.toContain("kurl_notes_feed");
    await click(tab("인기"));
    expect(document.cookie).toContain("kurl_notes_feed=trending");
  });

  it("drops a saved 팔로잉 once the visitor turns out signed out, and leaves the restored view for 추천", async () => {
    document.cookie = "kurl_blog_default_tab=following; Path=/";
    mocks.auth.authenticated = false;
    await render({ surface: "blog", tabs: blogTabs("following") });
    expect(document.cookie).not.toContain("kurl_blog_default_tab=following");
    expect(mocks.replace).toHaveBeenCalledWith("?sort=for-you");
  });

  it("keeps an explicit ?sort=following link where it is", async () => {
    document.cookie = "kurl_blog_default_tab=following; Path=/";
    window.history.replaceState(null, "", "/ko/blog?sort=following");
    mocks.auth.authenticated = false;
    await render({ surface: "blog", tabs: blogTabs("following") });
    expect(document.cookie).not.toContain("kurl_blog_default_tab=following");
    expect(mocks.replace).not.toHaveBeenCalled();
    window.history.replaceState(null, "", "/");
  });
});
