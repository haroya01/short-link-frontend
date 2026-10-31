import type { MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-view-transitions", () => ({ useTransitionRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/i18n/navigation", () => ({ Link: () => null }));

import { shouldTransition } from "./transition-link";

function click(href: string | null, init: Partial<MouseEvent<HTMLAnchorElement>> = {}, target = "") {
  const anchor = document.createElement("a");
  if (href !== null) anchor.setAttribute("href", href);
  if (target) anchor.target = target;
  return {
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    currentTarget: anchor,
    ...init,
  } as MouseEvent<HTMLAnchorElement>;
}

describe("shouldTransition", () => {
  it("returns the href for a plain left click to another in-app path", () => {
    expect(shouldTransition(click("/ko/analytics"), "/ko/dashboard")).toBe("/ko/analytics");
  });

  it("leaves modifier, middle and already-handled clicks to the browser", () => {
    for (const init of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
      expect(shouldTransition(click("/ko/analytics", init), "/ko/dashboard")).toBeNull();
    }
  });

  it("skips the current page, new-tab targets, and cross-origin hrefs", () => {
    expect(shouldTransition(click("/ko/dashboard"), "/ko/dashboard")).toBeNull();
    expect(shouldTransition(click("/ko/analytics", {}, "_blank"), "/ko/dashboard")).toBeNull();
    expect(shouldTransition(click("https://blog.kurl.me/"), "/ko/dashboard")).toBeNull();
    expect(shouldTransition(click("//blog.kurl.me/"), "/ko/dashboard")).toBeNull();
    expect(shouldTransition(click("mailto:hi@kurl.me"), "/ko/dashboard")).toBeNull();
    expect(shouldTransition(click(null), "/ko/dashboard")).toBeNull();
  });
});
