import React, { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMenuKeys } from "./use-menu-keys";

const onClose = vi.fn();
const onEdge = vi.fn();

function Menu({ tabCloses = true, edge = false }: { tabCloses?: boolean; edge?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { onKeyDown, focusFirst } = useMenuKeys(ref, { onClose, tabCloses, onEdge: edge ? onEdge : undefined });
  return (
    <div ref={ref} role="menu" onKeyDown={onKeyDown}>
      <button type="button" role="menuitem" onClick={focusFirst}>
        one
      </button>
      <button type="button" role="menuitem">
        two
      </button>
      <button type="button" role="menuitem">
        three
      </button>
    </div>
  );
}

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

const items = () => Array.from(host.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
const press = (key: string) => {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  act(() => {
    (document.activeElement ?? host).dispatchEvent(event);
  });
  return event;
};

describe("useMenuKeys", () => {
  it("walks the items with the arrows, wrapping, and jumps with Home and End", async () => {
    await act(async () => root.render(<Menu />));
    items()[0].focus();
    press("ArrowDown");
    expect(document.activeElement).toBe(items()[1]);
    press("End");
    expect(document.activeElement).toBe(items()[2]);
    press("ArrowDown");
    expect(document.activeElement).toBe(items()[0]);
    press("ArrowUp");
    expect(document.activeElement).toBe(items()[2]);
    press("Home");
    expect(document.activeElement).toBe(items()[0]);
  });

  it("closes with focus back to the trigger on Escape, and without it on Tab", async () => {
    await act(async () => root.render(<Menu />));
    items()[1].focus();
    expect(press("Escape").defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenLastCalledWith(true);
    expect(press("Tab").defaultPrevented).toBe(false);
    expect(onClose).toHaveBeenLastCalledWith(false);
  });

  it("leaves Tab alone when the surface keeps it, and hands the ends to onEdge", async () => {
    await act(async () => root.render(<Menu tabCloses={false} edge />));
    items()[0].focus();
    press("Tab");
    expect(onClose).not.toHaveBeenCalled();
    onEdge.mockReturnValueOnce(true);
    press("ArrowUp");
    expect(onEdge).toHaveBeenCalledWith("start");
    expect(document.activeElement).toBe(items()[0]);
  });
});
