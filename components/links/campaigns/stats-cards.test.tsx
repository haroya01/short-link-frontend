import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { CampaignStats } from "@/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { ByBatchTable } from "./stats-cards";

beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

const stats: CampaignStats = {
  totalClicks: 12,
  testScans: 0,
  lastTestScanAt: null,
  byBatch: [
    { batchId: 1, batchName: "역 앞", distributor: null, area: null, quantity: 100, shortCode: "abc123", clicks: 12 },
  ],
  byDistributor: [],
  byArea: [],
  byHour: [],
  byDay: [],
  heatmap: [],
};

describe("ByBatchTable", () => {
  it("links each batch to its short URL on the short-link host", () => {
    const root = document.createElement("template");
    root.innerHTML = renderToStaticMarkup(<ByBatchTable stats={stats} />);
    const href = root.content.querySelector("a")?.getAttribute("href");
    expect(href).toBe("https://kurl.me/abc123");
    expect(new URL(href!).host).toBe("kurl.me");
  });
});
