import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HeatmapCell } from "@/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).join("/")}` : key,
}));

import { Heatmap } from "./heatmap";

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

const CELLS: HeatmapCell[] = [
  { dayOfWeek: "MONDAY", hour: 9, count: 2 },
  { dayOfWeek: "MONDAY", hour: 10, count: 6 },
  { dayOfWeek: "SATURDAY", hour: 21, count: 12 },
  { dayOfWeek: "SUNDAY", hour: 2, count: 1 },
];

const desktop = () => [...host.querySelectorAll<HTMLButtonElement>('[data-testid="heatmap-hours"] button')];
const mobile = () => [...host.querySelectorAll<HTMLButtonElement>('[data-testid="heatmap-buckets"] button')];
const accent = (cells: HTMLButtonElement[]) => cells.filter((cell) => cell.className.includes("bg-accent"));
const cell = (day: string, hour: number) => desktop().find((b) => b.getAttribute("aria-label")?.startsWith(`tooltip:${day}/${hour}/`))!;

async function render(data = CELLS) {
  await act(async () => root.render(<Heatmap data={data} />));
}

describe("Heatmap is a neutral ramp with one accent cell", () => {
  it("gives the accent only to the hottest hour, and to the hottest 4h bucket on a phone", async () => {
    await render();
    expect(accent(desktop()).map((b) => b.getAttribute("aria-label"))).toEqual(["tooltip:SATURDAY/21/12"]);
    expect(accent(mobile()).map((b) => b.getAttribute("aria-label"))).toEqual(["tooltipBucket:SATURDAY/20/23/12"]);
  });

  it("paints every other cell in slate steps that grow with the count", async () => {
    await render();
    expect(cell("MONDAY", 10).className).toContain("bg-slate-300");
    expect(cell("MONDAY", 9).className).toContain("bg-slate-200");
    expect(cell("SUNDAY", 2).className).toContain("bg-slate-200");
    expect(cell("TUESDAY", 4).className).toContain("bg-slate-50");
    expect(desktop().filter((b) => /bg-accent-(?!600)/.test(b.className))).toEqual([]);
  });

  it("keeps the low end off the page background in dark mode", async () => {
    await render();
    const empty = cell("TUESDAY", 4).className;
    expect(empty).toContain("dark:bg-slate-900");
    expect(empty).toContain("dark:ring-slate-800");
    expect(cell("MONDAY", 9).className).toContain("dark:bg-slate-800");
    expect(host.innerHTML).not.toContain("dark:bg-slate-950");
  });

  it("moves the accent to the hovered cell and back to the hottest when the pointer leaves", async () => {
    await render();
    await act(async () => cell("MONDAY", 10).dispatchEvent(new MouseEvent("mouseover", { bubbles: true })));
    expect(accent(desktop()).map((b) => b.getAttribute("aria-label"))).toEqual(["tooltip:MONDAY/10/6"]);
    expect(host.querySelector('[data-testid="heatmap-detail"]')).not.toBeNull();
    await act(async () => cell("MONDAY", 10).dispatchEvent(new MouseEvent("mouseout", { bubbles: true })));
    expect(accent(desktop()).map((b) => b.getAttribute("aria-label"))).toEqual(["tooltip:SATURDAY/21/12"]);
  });

  it("names the hottest cell in the legend row before anyone points", async () => {
    await render();
    const details = [...host.querySelectorAll('[data-testid="heatmap-detail"]')].map((d) => d.textContent);
    expect(details).toContain("detailHourly:SATURDAY/21·detailClicks:12·detailShare:57%");
  });

  it("says there is no data in a plain left-aligned line", async () => {
    await render([]);
    const line = host.querySelector("p")!;
    expect(line.textContent).toBe("noData");
    expect(line.className).not.toContain("text-center");
  });
});
