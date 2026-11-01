import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

import { DailyChart } from "./daily-chart";

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

const DAYS = [
  { date: "2026-10-27", count: 4 },
  { date: "2026-10-28", count: 0 },
  { date: "2026-10-29", count: 12 },
  { date: "2026-10-30", count: 6 },
  { date: "2026-10-31", count: 0 },
  { date: "2026-11-01", count: 3 },
];

const slots = () => [...host.querySelectorAll<HTMLElement>("[data-count]")];
const label = () => host.querySelector('[data-testid="daily-chart-label"]')?.textContent;
const plot = () => host.querySelector<HTMLElement>('[role="img"]')!;

async function render(data = DAYS) {
  await act(async () => root.render(<DailyChart data={data} />));
}

describe("DailyChart draws one bar per day, never a curve between days", () => {
  it("gives every day its own slot and paints a bar only where a click landed", async () => {
    await render();
    expect(slots().map((slot) => Number(slot.dataset.count))).toEqual([4, 0, 12, 6, 0, 3]);
    expect(slots().map((slot) => slot.childElementCount)).toEqual([1, 0, 1, 1, 0, 1]);
    expect(host.querySelector("svg, path")).toBeNull();
  });

  it("scales bars to the busiest day and keeps a small day visible", async () => {
    await render();
    const heights = slots().map((slot) => (slot.firstElementChild as HTMLElement | null)?.style.height ?? null);
    expect(heights[2]).toBe("max(2px, 100%)");
    expect(heights[0]).toBe(`max(2px, ${(4 / 12) * 100}%)`);
    expect(heights[1]).toBeNull();
  });

  it("labels the peak on its bar instead of writing a sentence above the chart", async () => {
    await render();
    expect(label()).toBe("12Oct 29");
    expect(host.querySelectorAll("p")).toHaveLength(0);
  });

  it("moves the one label with the keyboard and returns it to the peak on blur", async () => {
    await render();
    await act(async () => plot().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })));
    expect(label()).toBe("0Oct 28");
    await act(async () => plot().dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })));
    expect(label()).toBe("3Nov 1");
    await act(async () => plot().dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
    expect(label()).toBe("12Oct 29");
  });

  it("paints only the active bar in the accent and the rest in one neutral tone", async () => {
    await render();
    const accented = () => slots().filter((slot) => slot.firstElementChild?.className.includes("bg-accent-600"));
    const bars = slots().filter((slot) => slot.firstElementChild);
    expect(accented().map((slot) => slot.dataset.count)).toEqual(["12"]);
    expect(bars.filter((slot) => slot.firstElementChild!.className.includes("bg-slate-300"))).toHaveLength(bars.length - 1);
    await act(async () => plot().dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })));
    expect(accented().map((slot) => slot.dataset.count)).toEqual(["3"]);
  });

  it("plays the grow-in once and leaves new bars still after a range switch", async () => {
    await render();
    expect(slots()[2].firstElementChild!.className).toContain("bar-grow-y");
    const lastBar = slots()[5].firstElementChild!;
    await act(async () => lastBar.dispatchEvent(new Event("animationend", { bubbles: true })));
    await render([{ date: "2026-10-26", count: 9 }, ...DAYS]);
    expect(host.querySelectorAll(".bar-grow-y")).toHaveLength(0);
  });

  it("keeps every value readable without hovering", async () => {
    await render();
    const rows = [...host.querySelectorAll("table tr")].map((tr) => tr.textContent);
    expect(rows).toHaveLength(6);
    expect(rows[2]).toBe('Oct 29clickCount:{"count":"12"}');
    expect(plot().getAttribute("aria-label")).toContain('chart.summary:{"date":"Oct 29","count":"12"}');
  });

  it("shows no label when the range has no clicks", async () => {
    await render(DAYS.map((d) => ({ ...d, count: 0 })));
    expect(label()).toBeUndefined();
    expect(slots().every((slot) => slot.childElementCount === 0)).toBe(true);
  });
});
