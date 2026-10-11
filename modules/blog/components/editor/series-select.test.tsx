import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/modules/blog/api/series", () => ({
  listSeries: vi.fn().mockResolvedValue([]),
  createSeries: vi.fn(),
}));

import { SeriesSelect } from "./series-select";

let root: Root;
let host: HTMLDivElement;
let frames: FrameRequestCallback[] = [];
const outerEscape = vi.fn();
const onWindowKey = (e: KeyboardEvent) => {
  if (e.key === "Escape") outerEscape();
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.addEventListener("keydown", onWindowKey);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  window.removeEventListener("keydown", onWindowKey);
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

const newButton = () =>
  [...host.querySelectorAll("button")].find((b) => b.textContent === "seriesNew" && !b.disabled)!;

describe("naming a new series inside the publish dialog", () => {
  it("lets Escape close only the name field, never the dialog around it, and hands focus back", async () => {
    await act(async () => root.render(<SeriesSelect value={null} onChange={vi.fn()} noneLabel="none" emptyHint="hint" />));
    await act(async () => newButton().click());
    const input = host.querySelector<HTMLInputElement>('input[aria-label="seriesNew"]')!;
    expect(document.activeElement).toBe(input);

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    expect(outerEscape).not.toHaveBeenCalled();
    expect(host.querySelector('input[aria-label="seriesNew"]')).toBeNull();
    await act(async () => frames.splice(0).forEach((cb) => cb(0)));
    expect(document.activeElement).toBe(newButton());
  });
});
