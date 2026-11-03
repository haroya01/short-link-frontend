import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHeldArrivals, type ArrivalAnchor } from "./use-held-arrivals";

type Item = { id: number };

function box(top: number, bottom: number) {
  const element = document.createElement("div");
  element.getBoundingClientRect = () => ({ top, bottom }) as DOMRect;
  return element;
}

describe("useHeldArrivals", () => {
  let root: Root;
  let result: ReturnType<typeof useHeldArrivals<Item>>;
  let anchor: ArrivalAnchor | null;
  let inserted: number[][];

  function Probe() {
    result = useHeldArrivals<Item>(
      () => anchor,
      (items) => inserted.push(items.map((item) => item.id)),
    );
    return null;
  }

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", (run: FrameRequestCallback) => {
      queueMicrotask(() => run(0));
      return 1;
    });
    window.scrollBy = vi.fn() as unknown as typeof window.scrollBy;
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    inserted = [];
    anchor = null;
    root = createRoot(document.createElement("div"));
    await act(async () => root.render(createElement(Probe)));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    document.querySelector(".vt-app-header")?.remove();
    vi.unstubAllGlobals();
  });

  it("puts items in right away when the spot they go is on screen or below it", async () => {
    anchor = { element: box(300, 420), edge: "bottom" };
    await act(async () => result.offer([{ id: 1 }]));
    anchor = { element: box(1200, 1300), edge: "bottom" };
    await act(async () => result.offer([{ id: 2 }]));
    expect(inserted).toEqual([[1], [2]]);
    expect(result.held).toBe(0);
  });

  it("holds items that would push what the reader is looking at, and counts them once", async () => {
    anchor = { element: box(-900, -400), edge: "bottom" };
    await act(async () => result.offer([{ id: 1 }, { id: 2 }]));
    await act(async () => result.offer([{ id: 2 }, { id: 3 }]));
    expect(inserted).toEqual([]);
    expect(result.held).toBe(3);
    expect(result.isHeld(2)).toBe(true);
    expect(result.isHeld(4)).toBe(false);
  });

  it("treats the strip under the sticky header as above the reader", async () => {
    const header = box(0, 56);
    header.className = "vt-app-header";
    document.body.append(header);
    anchor = { element: box(-20, 40), edge: "bottom" };
    await act(async () => result.offer([{ id: 1 }]));
    expect(result.held).toBe(1);
    anchor = { element: box(60, 400), edge: "top" };
    await act(async () => result.offer([{ id: 2 }]));
    expect(inserted).toEqual([[2]]);
  });

  it("lets held items in once the reader scrolls back to where they go", async () => {
    anchor = { element: box(-900, -400), edge: "bottom" };
    await act(async () => result.offer([{ id: 1 }, { id: 2 }]));
    await act(async () => void window.dispatchEvent(new Event("scroll")));
    expect(result.held).toBe(2);
    anchor = { element: box(100, 300), edge: "bottom" };
    await act(async () => void window.dispatchEvent(new Event("scroll")));
    expect(inserted).toEqual([[1, 2]]);
    expect(result.held).toBe(0);
    expect(result.isHeld(1)).toBe(false);
  });

  it("scrolls to the spot when the reader taps the line instead of jumping the list", async () => {
    anchor = { element: box(-900, -400), edge: "bottom" };
    await act(async () => result.offer([{ id: 1 }]));
    await act(async () => result.show());
    expect(window.scrollBy).toHaveBeenCalledWith({ top: -400 - 800 * 0.4, behavior: "smooth" });
    expect(inserted).toEqual([]);

    anchor = { element: box(-1500, -1000), edge: "top" };
    await act(async () => result.show());
    expect(window.scrollBy).toHaveBeenLastCalledWith({ top: -1500 - 8, behavior: "smooth" });
  });
});
