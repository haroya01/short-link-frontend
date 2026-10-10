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

const blogTabs = (active = "recent"): FeedSortTab[] => [
  { key: "following", label: "팔로잉", href: "?sort=following", active: active === "following" },
  { key: "recent", label: "최신", href: "?sort=recent", active: active === "recent" },
  { key: "trending", label: "인기", href: "?sort=trending", active: active === "trending" },
];
const blogMore = [
  { key: "for-you", label: "추천", href: "?sort=for-you" },
  { key: "series", label: "시리즈", href: "?sort=series" },
  { key: "followed-topics", label: "팔로우한 주제", href: "/blog/curation?open=topics", external: true },
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
  it("lays out 팔로잉 · 최신 · 인기 and keeps 팔로잉 for signed-out visitors", async () => {
    mocks.auth.authenticated = false;
    await render({ surface: "blog", tabs: blogTabs(), more: blogMore });
    expect([...host.querySelectorAll("nav a")].map((a) => a.textContent)).toEqual(["팔로잉", "최신", "인기"]);
    expect(host.querySelector("[data-feed-more]")).toBeNull();
  });

  it("offers the surface's other sources in 더 보기 once signed in", async () => {
    await render({ surface: "blog", tabs: blogTabs(), more: blogMore });
    const more = host.querySelector<HTMLButtonElement>("[data-feed-more] button")!;
    expect(more.textContent).toContain("feedMore");
    await click(more);
    expect([...host.querySelectorAll('[role="menuitem"]')].map((a) => a.textContent)).toEqual(["추천", "시리즈", "팔로우한 주제"]);
  });

  it("remembers the switcher tab the reader picks, per surface", async () => {
    await render({ surface: "blog", tabs: blogTabs(), more: blogMore });
    await click(tab("인기"));
    expect(document.cookie).toContain("kurl_blog_default_tab=trending");
    expect(document.cookie).not.toContain("kurl_notes_feed");
    expect(mocks.push).toHaveBeenCalledWith(expect.stringContaining("?sort=trending"));
  });

  it("never remembers a 더 보기 source", async () => {
    await render({ surface: "blog", tabs: blogTabs("trending"), more: blogMore });
    await click(tab("인기"));
    await click(host.querySelector("[data-feed-more] button")!);
    await click([...host.querySelectorAll('[role="menuitem"]')].find((a) => a.textContent === "추천")!);
    expect(document.cookie).toContain("kurl_blog_default_tab=trending");
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

  it("drops a saved 팔로잉 once the visitor turns out signed out, and leaves the restored view for 최신", async () => {
    document.cookie = "kurl_blog_default_tab=following; Path=/";
    mocks.auth.authenticated = false;
    await render({ surface: "blog", tabs: blogTabs("following") });
    expect(document.cookie).not.toContain("kurl_blog_default_tab=following");
    expect(mocks.replace).toHaveBeenCalledWith("?sort=recent");
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
