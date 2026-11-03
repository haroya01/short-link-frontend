import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { LinkEvent } from "@/lib/api/link-events";
import type { LinkStats } from "@/types";

const api = vi.hoisted(() => ({ getLinkEvents: vi.fn(), downloadLinkEventsCsv: vi.fn(), downloadLinkStatsCsv: vi.fn() }));
const toast = vi.hoisted(() => vi.fn());
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
vi.mock("@/lib/api/link-events", () => api);
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/lib/error-messages", () => ({ useApiErrorMessage: () => (_e: unknown, fallback: string) => fallback }));
vi.mock("./settings-tab", () => ({ DemoBadge: () => createElement("span", null, "badge") }));

import { LogTab } from "./log-tab";

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
  vi.clearAllMocks();
});

const stats = (extra: Partial<LinkStats> = {}) => ({ shortCode: "spr1ng", timezone: "Asia/Seoul", ...extra }) as LinkStats;
const event = (city: string): LinkEvent => ({
  clickedAt: "2026-10-21T11:00:00Z", country: "KR", region: null, city, device: "mobile", os: "iOS", browser: "Safari",
  referrer: null, referrerHost: "x.com", channel: "social", language: "ko", bot: false, botName: null, ipMasked: null,
});
const button = (label: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === label);
const tableRows = () => container.querySelectorAll("tbody tr");

it("shows the log as soon as the tab opens, with no button to reveal it", async () => {
  api.getLinkEvents.mockResolvedValue({ items: [event("Seoul"), event("Busan")], nextCursor: null });
  await act(async () => root.render(createElement(LogTab, { data: stats() })));
  expect(api.getLinkEvents).toHaveBeenCalledTimes(1);
  expect(api.getLinkEvents).toHaveBeenCalledWith("spr1ng", null);
  expect(tableRows()).toHaveLength(2);
  expect(container.querySelectorAll("li")).toHaveLength(2);
  expect(tableRows()[0].textContent).toContain("Seoul, South Korea");
  expect(button("loadMore")).toBeUndefined();
});

it("reads every value in people's words and in the owner's time zone", async () => {
  api.getLinkEvents.mockResolvedValue({
    items: [
      { ...event("Seoul"), referrerHost: null, channel: "direct" },
      { ...event("Tokyo"), country: "JP", device: null, os: null, browser: null, referrerHost: null, channel: null, bot: true, botName: "preview:kakaotalk-scrap" },
      { ...event("Ashburn"), country: "US", bot: true, botName: "datacenter:Amazon.com, Inc." },
    ],
    nextCursor: null,
  });
  await act(async () => root.render(createElement(LogTab, { data: stats({ timezone: "America/New_York" }) })));
  const cells = [...tableRows()].map((row) => [...row.children].map((cell) => cell.textContent));
  expect(cells[0]).toEqual(["2026.10.21 07:00:00", "Seoul, South Korea", "device.mobile · iOS · Safari", "channel.direct"]);
  expect(cells[1].slice(1)).toEqual(["Tokyo, Japan", "botKind.preview · kakaotalk", "—"]);
  expect(cells[2][2]).toBe("botKind.datacenter · Amazon.com, Inc.");
  expect(container.textContent).toContain("America/New_York");
});

it("load more appends the next page by cursor and goes away on the last page", async () => {
  api.getLinkEvents
    .mockResolvedValueOnce({ items: [event("Seoul")], nextCursor: "c2" })
    .mockResolvedValueOnce({ items: [event("Tokyo")], nextCursor: null });
  await act(async () => root.render(createElement(LogTab, { data: stats() })));
  await act(async () => button("loadMore")!.click());
  expect(api.getLinkEvents).toHaveBeenLastCalledWith("spr1ng", "c2");
  expect([...tableRows()].map((row) => row.children[1].textContent)).toEqual(["Seoul, South Korea", "Tokyo, South Korea"]);
  expect(button("loadMore")).toBeUndefined();
});

it("carries both CSV exports", async () => {
  api.getLinkEvents.mockResolvedValue({ items: [], nextCursor: null });
  await act(async () => root.render(createElement(LogTab, { data: stats() })));
  await act(async () => button("exportEvents")!.click());
  await act(async () => button("exportStats")!.click());
  expect(api.downloadLinkEventsCsv).toHaveBeenCalledWith("spr1ng");
  expect(api.downloadLinkStatsCsv).toHaveBeenCalledWith("spr1ng", "daily");
});

it("says one line when there are no clicks", async () => {
  api.getLinkEvents.mockResolvedValue({ items: [], nextCursor: null });
  await act(async () => root.render(createElement(LogTab, { data: stats() })));
  expect(container.textContent).toContain("empty");
  expect(container.querySelector("table")).toBeNull();
});

it("names the retention window only once the stats carry a raw boundary", async () => {
  api.getLinkEvents.mockResolvedValue({ items: [event("Seoul")], nextCursor: null });
  await act(async () => root.render(createElement(LogTab, { data: stats() })));
  expect(container.textContent).not.toContain("retention");
  await act(async () => root.render(createElement(LogTab, { data: stats({ rawRetentionDays: 90, rawSince: null }) })));
  expect(container.textContent).not.toContain("retention");
  await act(async () => root.render(createElement(LogTab, { data: stats({ rawRetentionDays: 90, rawSince: "2026-07-24T00:00:00Z" }) })));
  expect(container.textContent).toContain('retention:{"days":90}');
});

it("mirrors the log on /demo without calling the API", async () => {
  await act(async () => root.render(createElement(LogTab, { data: stats(), demo: true })));
  expect(api.getLinkEvents).not.toHaveBeenCalled();
  expect(tableRows().length).toBeGreaterThan(0);
  expect(button("exportEvents")!.disabled).toBe(true);
  expect(container.textContent).toContain("badge");
});
