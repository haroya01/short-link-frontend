import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { LinkStats } from "@/types";
import { realLinkStats } from "@/lib/link-stats-real.fixture";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));

import { ClickQualitySummary } from "./click-quality-summary";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const stats = (extra: Partial<LinkStats>) =>
  ({
    totalClicks: 120,
    humanClicks: 100,
    previewClicks: 20,
    peakHour: 21,
    returnRate: { newVisitors: 60, returningVisitors: 20, ratio: 0.25 },
    ...extra,
  }) as LinkStats;

const metric = (label: string) =>
  [...container.querySelectorAll("dl > div")].find((cell) => cell.querySelector("dt")?.textContent === label)?.querySelector("dd")?.textContent;

it("names the 90-day window of the returning ratio once, only when the stats carry a raw boundary", async () => {
  await act(async () => root.render(createElement(ClickQualitySummary, { data: stats({ rawRetentionDays: 90, rawSince: null }) })));
  expect(container.textContent).not.toContain("returningWindow");

  await act(async () => root.render(createElement(ClickQualitySummary, { data: stats({ rawRetentionDays: 90, rawSince: "2026-07-24T00:00:00Z" }) })));
  expect(container.textContent?.match(/returningWindow:\{"days":90\}/g)).toHaveLength(1);
});

it("divides all-time human clicks by all-time estimated visitors, not by the 90-day return window", async () => {
  await act(async () => root.render(createElement(ClickQualitySummary, { data: realLinkStats() })));
  expect(metric("clicksPerUnique")).toBe("1.8");
  expect(metric("unique")).toBe("640");
});

it("reads as one number line, not a row of cards", async () => {
  await act(async () => root.render(createElement(ClickQualitySummary, { data: stats({}) })));
  expect(container.querySelector(".rounded-2xl")).toBeNull();
  expect([...container.querySelectorAll("dt")].map((dt) => dt.textContent)).toEqual(["unique", "clicksPerUnique", "returning", "previews", "peakHour"]);
});
