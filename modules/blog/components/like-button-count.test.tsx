import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toggle = vi.hoisted(() => ({ state: { on: false, count: 0 as number | undefined } }));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/hooks/use-like-failed", () => ({ useLikeFailed: () => () => {} }));
vi.mock("@/modules/blog/lib/use-optimistic-toggle", () => ({
  useOptimisticToggle: () => ({ ...toggle.state, toggle: () => {} }),
}));

import { LikeButton } from "./like-button";

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
const button = () => host.querySelector("button")!;
const count = () => host.querySelector("[data-testid=like-count]");

describe("the post ♡", () => {
  it("is the heart alone at zero, a square icon button", async () => {
    toggle.state = { on: false, count: 0 };
    await render(<LikeButton postId={1} initialCount={0} postTitle="글" />);
    expect(count()).toBeNull();
    expect(button().className).toContain("w-9");
    expect(button().getAttribute("title")).toBe("like");
  });

  it("shows the count beside the heart once anyone has liked it", async () => {
    toggle.state = { on: true, count: 12 };
    await render(<LikeButton postId={1} initialCount={12} postTitle="글" />);
    expect(count()!.textContent).toBe("12");
    expect(button().className).toContain("w-auto");
    expect(button().getAttribute("aria-pressed")).toBe("true");
  });

  it("carries the count inside the dock's disc, under the heart", async () => {
    toggle.state = { on: false, count: 3 };
    await render(<LikeButton postId={1} initialCount={3} postTitle="글" variant="dock" />);
    expect(count()!.textContent).toBe("3");
    expect(button().className).toContain("h-11 w-11");
  });
});
