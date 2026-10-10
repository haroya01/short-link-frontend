import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/modules/blog/components/like-button", () => ({ LikeButton: () => <button type="button">like</button> }));
vi.mock("@/modules/blog/components/bookmark-button", () => ({
  BookmarkButton: () => <button type="button">bookmark</button>,
}));
vi.mock("@/modules/blog/components/connect-button", () => ({
  ConnectButton: () => <button type="button">connect</button>,
}));
vi.mock("@/modules/blog/components/post-toc", () => ({ TocSheet: () => null }));

import { PostDock } from "./post-dock";
import { useMarkDockedComposer } from "@/modules/blog/lib/docked-composer";

let root: Root;
let container: HTMLDivElement;
let sentinel: HTMLDivElement;
let report: (top: number) => void;

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: IntersectionObserverCallback) {
        report = (top) =>
          act(() =>
            cb(
              [{ boundingClientRect: { top }, rootBounds: { height: 800 } } as unknown as IntersectionObserverEntry],
              this as unknown as IntersectionObserver,
            ),
          );
      }
      observe() {}
      disconnect() {}
    },
  );
  sentinel = document.createElement("div");
  sentinel.setAttribute("data-post-end", "");
  document.body.appendChild(sentinel);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  sentinel.remove();
  vi.unstubAllGlobals();
});

const heading = (id: string) => ({ id, text: id, level: 2 });
const dock = () => container.querySelector<HTMLElement>("[data-testid=post-dock]")!;
const away = () => dock().hasAttribute("data-away");

function Composer({ open }: { open: boolean }) {
  useMarkDockedComposer(open);
  return null;
}

async function render(headings = [heading("a"), heading("b")], composer = false) {
  await act(async () =>
    root.render(
      <>
        <PostDock postId={1} postTitle="t" likeCount={0} headings={headings} />
        <Composer open={composer} />
      </>,
    ),
  );
}

describe("PostDock", () => {
  it("carries the contents button only from two headings", async () => {
    await render([heading("a")]);
    expect([...dock().querySelectorAll("button")].map((b) => b.textContent || b.getAttribute("aria-label"))).toEqual([
      "connect",
      "like",
      "bookmark",
    ]);
    await render([heading("a"), heading("b")]);
    expect(dock().querySelector("button")?.getAttribute("aria-label")).toBe("toc");
  });

  it("steps away once the end of the post scrolls in, and comes back above it", async () => {
    await render();
    report(1200);
    expect(away()).toBe(false);
    report(500);
    expect(away()).toBe(true);
    expect(dock().getAttribute("aria-hidden")).toBe("true");
    report(-300);
    expect(away()).toBe(true);
    report(1200);
    expect(away()).toBe(false);
  });

  it("stays on a short post whose end is already on screen, but not on a deep link past the end", async () => {
    await render();
    report(500);
    expect(away()).toBe(false);
    report(-50);
    expect(away()).toBe(true);
  });

  it("steps away while the docked comment composer is open", async () => {
    await render(undefined, true);
    expect(away()).toBe(true);
    await render(undefined, false);
    expect(away()).toBe(false);
  });
});
