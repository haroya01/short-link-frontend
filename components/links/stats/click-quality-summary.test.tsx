import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { LinkStats } from "@/types";

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

const returningCard = () => [...container.querySelectorAll(".rounded-2xl")].find((card) => card.textContent?.includes("returning"))!;

it("marks the returning ratio with the raw window only once the stats carry a raw boundary", async () => {
  await act(async () => root.render(createElement(ClickQualitySummary, { data: stats({ rawRetentionDays: 90, rawSince: null }) })));
  expect(container.textContent).not.toContain("rawWindow");

  await act(async () => root.render(createElement(ClickQualitySummary, { data: stats({ rawRetentionDays: 90, rawSince: "2026-07-24T00:00:00Z" }) })));
  expect(returningCard().textContent).toContain('rawWindow:{"days":90}');
  expect(container.textContent?.match(/rawWindow/g)).toHaveLength(1);
});
