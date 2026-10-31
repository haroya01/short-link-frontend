import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionMenu, type ActionMenuItem } from "./action-menu";

let root: Root;
let host: HTMLDivElement;

async function render(items: ActionMenuItem[]) {
  await act(async () => root.render(<ActionMenu label="more" items={items} />));
}

const trigger = () => host.querySelector<HTMLButtonElement>('button[aria-label="more"]')!;
const menu = () => host.querySelector('[role="menu"]');

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
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

describe("ActionMenu", () => {
  it("renders a checked item as menuitemcheckbox and plain actions as menuitem", async () => {
    await render([
      { label: "edit", icon: Pencil, onSelect: vi.fn() },
      { label: "public", icon: Eye, checked: true, onSelect: vi.fn() },
      { label: "private", icon: Eye, checked: false, onSelect: vi.fn() },
    ]);
    await act(async () => trigger().click());

    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    const items = Array.from(menu()!.querySelectorAll("button"));
    expect(items.map((b) => [b.getAttribute("role"), b.getAttribute("aria-checked")])).toEqual([
      ["menuitem", null],
      ["menuitemcheckbox", "true"],
      ["menuitemcheckbox", "false"],
    ]);
  });

  it("runs the selected action, closes, and returns focus to the trigger", async () => {
    const onDelete = vi.fn();
    await render([
      { label: "edit", icon: Pencil, onSelect: vi.fn() },
      { label: "delete", icon: Trash2, destructive: true, onSelect: onDelete },
    ]);
    await act(async () => trigger().click());
    await act(async () => Array.from(menu()!.querySelectorAll("button"))[1].click());

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it("moves focus with arrow keys over enabled items and closes on Escape", async () => {
    await render([
      { label: "a", icon: Pencil, onSelect: vi.fn() },
      { label: "b", icon: Pencil, disabled: true, onSelect: vi.fn() },
      { label: "c", icon: Eye, checked: false, onSelect: vi.fn() },
    ]);
    await act(async () => trigger().click());
    const [a, , c] = Array.from(menu()!.querySelectorAll("button"));
    expect(document.activeElement).toBe(a);

    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" })));
    expect(document.activeElement).toBe(c);
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" })));
    expect(document.activeElement).toBe(a);

    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });
});
