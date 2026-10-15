import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const marked = vi.hoisted(() => [] as number[]);
vi.mock("@/lib/analytics/behavior", () => ({ trackBehavior: vi.fn(), flushBehavior: vi.fn() }));
vi.mock("@/modules/blog/lib/read-posts", () => ({ markPostRead: (id: number) => marked.push(id) }));

import { ReadProgressBeacon } from "./read-progress-beacon";

let root: Root;
let article: HTMLElement;
let rect = { top: 0, height: 0 };

function layout(top: number, height: number) {
  rect = { top, height };
}

async function mount() {
  article = document.createElement("article");
  article.className = "prose-post";
  article.getBoundingClientRect = () => ({ top: rect.top, height: rect.height }) as DOMRect;
  document.body.append(article);
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(createElement(ReadProgressBeacon, { postId: 42 })));
}

async function scrollTo(top: number) {
  rect = { ...rect, top };
  await act(async () => {
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(20);
  });
}

beforeEach(() => {
  marked.length = 0;
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"] });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("ReadProgressBeacon read mark", () => {
  it("marks a long post read only once the reader reaches its end", async () => {
    layout(100, 3000);
    await mount();
    await scrollTo(-1500);
    expect(marked).toEqual([]);
    await scrollTo(-2300);
    expect(marked).toEqual([42]);
  });

  it("marks a post that fits the first screen after a 2.5s stay", async () => {
    layout(100, 400);
    await mount();
    await act(async () => vi.advanceTimersByTime(2_400));
    expect(marked).toEqual([]);
    await act(async () => vi.advanceTimersByTime(200));
    expect(marked).toEqual([42]);
  });

  it("does not mark a short post the reader leaves within 2.5s", async () => {
    layout(100, 400);
    await mount();
    await act(async () => vi.advanceTimersByTime(1_000));
    await act(async () => root.unmount());
    await act(async () => vi.advanceTimersByTime(5_000));
    expect(marked).toEqual([]);
  });
});
