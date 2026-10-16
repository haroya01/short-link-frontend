import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ saved: false, toggle: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/modules/blog/lib/use-bookmarks", () => ({
  useBookmarks: () => ({ isSaved: () => mocks.saved, toggle: mocks.toggle }),
}));

import { FeedCardBookmark } from "./feed-card-bookmark";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
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

async function render(removeOnly: boolean) {
  await act(async () => root.render(createElement(FeedCardBookmark, { postId: 9, username: "hana", slug: "s", removeOnly })));
}

describe("the save control on a card the reader can no longer open", () => {
  it("offers nothing to add, since saving a locked post is refused", async () => {
    mocks.saved = false;
    await render(true);
    expect(host.querySelector("button")).toBeNull();
  });

  it("still takes a saved post out, since removing is never gated", async () => {
    mocks.saved = true;
    await render(true);
    await act(async () => host.querySelector("button")!.click());
    expect(mocks.toggle).toHaveBeenCalledWith(9, "hana", "s");
  });

  it("stays a plain toggle on an open post", async () => {
    mocks.saved = false;
    await render(false);
    expect(host.querySelector("button")?.getAttribute("aria-pressed")).toBe("false");
  });
});
