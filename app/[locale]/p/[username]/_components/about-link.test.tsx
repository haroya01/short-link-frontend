import React, { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/ko/p/minji";

vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ me: null }) }));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ href, children, ...rest }: { href: string; children: ReactNode }) =>
    createElement("a", { href, ...rest }, children),
}));

import { AboutLink } from "./about-link";
import { AuthorTabs } from "./author-tabs";

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
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

const render = (node: ReactNode) => act(async () => root.render(node));

const TABS = [
  { key: "posts", href: "/ko/p/minji", label: "글" },
  { key: "notes", href: "/ko/p/minji/notes", label: "노트" },
  { key: "series", href: "/ko/p/minji/series", label: "시리즈" },
];

describe("소개 in the header's meta line", () => {
  it("marks itself as the current page on /about, on both the path and @handle forms", async () => {
    for (const path of ["/ko/p/minji/about", "/@minji/about"]) {
      pathname = path;
      await render(<AboutLink href="/ko/p/minji/about" label="소개" />);
      expect(host.querySelector("a")!.getAttribute("aria-current")).toBe("page");
    }
  });

  it("is a plain link everywhere else", async () => {
    for (const path of ["/ko/p/minji", "/ko/p/minji/notes", "/ko/p/minji/about-me-post"]) {
      pathname = path;
      await render(<AboutLink href="/ko/p/minji/about" label="소개" />);
      expect(host.querySelector("a")!.hasAttribute("aria-current")).toBe(false);
    }
  });
});

describe("the tab row while 소개 is open", () => {
  it("has no current tab, so nothing is underlined", async () => {
    pathname = "/ko/p/minji/about";
    await render(<AuthorTabs tabs={TABS} username="minji" />);
    expect(host.querySelectorAll("[data-tab]")).toHaveLength(3);
    expect(host.querySelector("[aria-current]")).toBeNull();
    expect(host.querySelector("nav > span")).toBeNull();
  });

  it("still marks the tab the path is on", async () => {
    pathname = "/ko/p/minji/notes";
    await render(<AuthorTabs tabs={TABS} username="minji" />);
    expect(host.querySelector("[aria-current=page]")!.textContent).toBe("노트");
  });
});
