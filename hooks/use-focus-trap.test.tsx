import React, { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFocusTrap } from "./use-focus-trap";

function Trap({ name, active, onEscape }: { name: string; active: boolean; onEscape: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, { active, onEscape, autoFocus: false });
  return (
    <div ref={ref} aria-label={name}>
      <button type="button">{`${name}-first`}</button>
      <button type="button">{`${name}-last`}</button>
    </div>
  );
}

let root: Root;
let host: HTMLDivElement;
const outerEscape = vi.fn();
const innerEscape = vi.fn();

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

async function render(innerOpen: boolean) {
  await act(async () =>
    root.render(
      <>
        <Trap name="outer" active onEscape={outerEscape} />
        {innerOpen && <Trap name="inner" active onEscape={innerEscape} />}
      </>,
    ),
  );
}

const button = (label: string) =>
  Array.from(document.querySelectorAll("button")).find((b) => b.textContent === label)!;
const press = (key: string) => window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

describe("stacked focus traps", () => {
  it("lets only the newest trap answer Escape", async () => {
    await render(false);
    await render(true);

    press("Escape");
    expect(innerEscape).toHaveBeenCalledTimes(1);
    expect(outerEscape).not.toHaveBeenCalled();
  });

  it("does not let the outer trap pull focus out of the inner one on Tab", async () => {
    await render(false);
    await render(true);
    const outer = document.querySelector('[aria-label="outer"]')!;
    const moves: Element[] = [];
    outer.addEventListener("focusin", (e) => moves.push(e.target as Element));

    button("inner-last").focus();
    press("Tab");
    expect(document.activeElement).toBe(button("inner-first"));
    expect(moves).toEqual([]);
  });

  it("hands the keys back to the outer trap once the inner one closes", async () => {
    await render(false);
    await render(true);
    await render(false);

    press("Escape");
    expect(outerEscape).toHaveBeenCalledTimes(1);
    expect(innerEscape).not.toHaveBeenCalled();
  });
});
