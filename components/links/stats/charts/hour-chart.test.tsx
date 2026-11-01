import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    key === "chart.hour" ? `${values?.hour}h` : values ? `${key}:${JSON.stringify(values)}` : key,
}));

import { HourChart } from "./hour-chart";

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

const slots = () => [...host.querySelectorAll<HTMLElement>("[data-count]")];
const accented = () => slots().filter((slot) => slot.firstElementChild?.className.includes("bg-accent-600"));
const label = () => host.querySelector('[data-testid="hour-chart-label"]')?.textContent;
const plot = () => host.querySelector<HTMLElement>('[role="img"]')!;

describe("HourChart draws the day's rhythm as 24 bars, not a curve", () => {
  it("fills every hour, with a bar only where clicks landed", async () => {
    await act(async () => root.render(<HourChart data={[{ hour: 9, count: 4 }, { hour: 21, count: 10 }]} />));
    expect(slots()).toHaveLength(24);
    expect(slots().filter((slot) => slot.firstElementChild).map((slot) => slot.dataset.count)).toEqual(["4", "10"]);
    expect(host.querySelector("svg, path")).toBeNull();
  });

  it("paints only the busiest hour in the accent and labels it on its bar", async () => {
    await act(async () => root.render(<HourChart data={[{ hour: 9, count: 4 }, { hour: 21, count: 10 }]} />));
    expect(accented().map((slot) => slot.dataset.count)).toEqual(["10"]);
    expect(slots()[9].firstElementChild!.className).toContain("bg-slate-300");
    expect(label()).toBe("1021h");
  });

  it("moves the accent and the label with the keys", async () => {
    await act(async () => root.render(<HourChart data={[{ hour: 9, count: 4 }, { hour: 21, count: 10 }]} />));
    await act(async () => plot().dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true })));
    expect(label()).toBe("00h");
    await act(async () => plot().dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })));
    expect(label()).toBe("023h");
    expect(accented()).toHaveLength(0);
  });

  it("marks the axis at 0, 6, 12, 18 and 23 without a y axis", async () => {
    await act(async () => root.render(<HourChart data={[{ hour: 3, count: 1 }]} />));
    const axis = host.querySelector('[aria-hidden="true"].relative')!;
    expect([...axis.children].map((tick) => tick.textContent)).toEqual(["0h", "6h", "12h", "18h", "23h"]);
  });

  it("says there are no clicks in one plain line when every hour is empty", async () => {
    await act(async () => root.render(<HourChart data={[]} />));
    expect(host.textContent).toBe("noClicks");
    expect(host.querySelector('[role="img"]')).toBeNull();
  });
});
