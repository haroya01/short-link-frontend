import { describe, expect, it, vi } from "vitest";
import type { AdminLinkClick, AdminLinkClicksPage } from "@/lib/api/admin";
import type { LinkEvent } from "@/lib/api/link-events";
import { statsLabels } from "@/lib/stats-labels";
import {
  chunkIds,
  clickDevice,
  clickPlace,
  clickSource,
  inClickView,
  leadClicks,
  loadUntilVisible,
  markClicks,
  selectionState,
  sendInChunks,
  toggleAll,
  toggleRange,
} from "./admin-clicks";

const labels = statsLabels((key) => key, "en");

type FetchPage = (cursor: string | null) => Promise<AdminLinkClicksPage>;

function event(over: Partial<LinkEvent> = {}): LinkEvent {
  return {
    clickedAt: "2026-11-11T01:00:00Z",
    country: "KR",
    region: "Seoul",
    regionCode: "KR-11",
    city: "Seoul",
    device: "mobile",
    os: "iOS",
    browser: "Safari",
    referrer: null,
    referrerHost: null,
    channel: "direct",
    language: "ko",
    bot: false,
    botName: null,
    ipMasked: "203.0.113.*",
    ...over,
  };
}

const human = (id: number): AdminLinkClick => ({ id, excluded: false, click: event() });
const excluded = (id: number): AdminLinkClick => ({
  id,
  excluded: true,
  click: event({ bot: true, botName: "preview:excluded" }),
});
const crawler = (id: number): AdminLinkClick => ({
  id,
  excluded: false,
  click: event({ bot: true, botName: "preview:slackbot", device: "bot" }),
});
const operator = (id: number): AdminLinkClick => ({
  id,
  excluded: false,
  click: event({ bot: true, botName: "preview:operator" }),
});

describe("the number an admin link row leads with", () => {
  it("leads with human clicks and keeps the bot-inclusive total beside it", () => {
    expect(leadClicks({ clickCount: 1234, humanClickCount: 1204 })).toEqual({ lead: 1204, total: 1234 });
  });

  it("still shows the total when every click was a bot", () => {
    expect(leadClicks({ clickCount: 30, humanClickCount: 0 })).toEqual({ lead: 0, total: 30 });
  });

  it("falls back to the one total a backend without humanClickCount sends", () => {
    expect(leadClicks({ clickCount: 1234 })).toEqual({ lead: 1234, total: null });
  });
});

describe("which clicks a view shows", () => {
  const rows = [human(1), crawler(2), excluded(3), operator(4), human(5)];

  it("the default view is human clicks only", () => {
    expect(rows.filter((row) => inClickView(row, "human")).map((row) => row.id)).toEqual([1, 5]);
  });

  it("the excluded view is only what an admin took out, never crawlers or operator visits", () => {
    expect(rows.filter((row) => inClickView(row, "excluded")).map((row) => row.id)).toEqual([3]);
  });
});

describe("selection", () => {
  const ids = [10, 11, 12, 13, 14];

  it("the header box is empty, mixed or full", () => {
    expect(selectionState(ids, new Set())).toBe("none");
    expect(selectionState(ids, new Set([11]))).toBe("some");
    expect(selectionState(ids, new Set(ids))).toBe("all");
    expect(selectionState([], new Set())).toBe("none");
  });

  it("a selection left over from rows that are not shown does not count", () => {
    expect(selectionState(ids, new Set([99]))).toBe("none");
  });

  it("the header box selects every loaded row, and clears when all are selected", () => {
    expect([...toggleAll(ids, new Set([11]))]).toEqual(ids);
    expect([...toggleAll(ids, new Set(ids))]).toEqual([]);
  });

  it("a plain click toggles one row", () => {
    expect([...toggleRange(ids, new Set([10]), null, 12, true)].sort()).toEqual([10, 12]);
    expect([...toggleRange(ids, new Set([10, 12]), null, 12, false)]).toEqual([10]);
  });

  it("a shift click selects everything between the last clicked row and this one, in either direction", () => {
    expect([...toggleRange(ids, new Set([11]), 11, 14, true)].sort()).toEqual([11, 12, 13, 14]);
    expect([...toggleRange(ids, new Set([13]), 13, 10, true)].sort()).toEqual([10, 11, 12, 13]);
  });

  it("a shift click on a checked row clears the range", () => {
    expect([...toggleRange(ids, new Set(ids), 11, 13, false)].sort()).toEqual([10, 14]);
  });

  it("a shift click whose anchor left the view falls back to one row", () => {
    expect([...toggleRange(ids, new Set(), 99, 12, true)]).toEqual([12]);
  });
});

describe("sending a selection", () => {
  const many = Array.from({ length: 450 }, (_, i) => i + 1);

  it("splits into batches of 200", () => {
    expect(chunkIds(many).map((chunk) => chunk.length)).toEqual([200, 200, 50]);
    expect(chunkIds(many.slice(0, 200)).map((chunk) => chunk.length)).toEqual([200]);
    expect(chunkIds([])).toEqual([]);
  });

  it("sends the batches one after another and adds up what the server changed", async () => {
    const inFlight: number[] = [];
    let overlapping = false;
    const send = vi.fn(async (chunk: number[]) => {
      if (inFlight.length > 0) overlapping = true;
      inFlight.push(chunk[0]);
      await Promise.resolve();
      inFlight.pop();
      return { changed: chunk.length - 1 };
    });

    await expect(sendInChunks(many, send)).resolves.toEqual({ changed: 447, error: null });
    expect(send.mock.calls.map(([chunk]) => chunk[0])).toEqual([1, 201, 401]);
    expect(overlapping).toBe(false);
  });

  it("stops at the first failed batch and reports what had already changed", async () => {
    const failure = new Error("boom");
    const send = vi
      .fn<(chunk: number[]) => Promise<{ changed: number }>>()
      .mockResolvedValueOnce({ changed: 200 })
      .mockRejectedValueOnce(failure);

    await expect(sendInChunks(many, send)).resolves.toEqual({ changed: 200, error: failure });
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe("reflecting a finished request in the loaded rows", () => {
  it("excluding marks the sent human clicks the way the server returns them", () => {
    const next = markClicks([human(1), human(2), crawler(3)], new Set([1, 3]), true);
    expect(next[0]).toMatchObject({ excluded: true, click: { bot: true, botName: "preview:excluded" } });
    expect(next[1]).toEqual(human(2));
    expect(next[2]).toEqual(crawler(3));
    expect(next.filter((row) => inClickView(row, "human")).map((row) => row.id)).toEqual([2]);
  });

  it("restoring turns only excluded clicks back into human clicks", () => {
    const next = markClicks([excluded(1), operator(2), excluded(3)], new Set([1, 2]), false);
    expect(next[0]).toMatchObject({ excluded: false, click: { bot: false, botName: null } });
    expect(next[1]).toEqual(operator(2));
    expect(next[2]).toEqual(excluded(3));
  });
});

describe("loading until something shows", () => {
  it("keeps going past pages that hold only bots", async () => {
    const pages = [
      { items: [crawler(9), crawler(8)], nextCursor: "a" },
      { items: [crawler(7)], nextCursor: "b" },
      { items: [human(6), crawler(5)], nextCursor: "c" },
      { items: [human(4)], nextCursor: null },
    ];
    const fetchPage = vi.fn<FetchPage>(async () => pages.shift()!);

    const loaded = await loadUntilVisible(fetchPage, null, "human", 5);

    expect(fetchPage.mock.calls.map(([cursor]) => cursor)).toEqual([null, "a", "b"]);
    expect(loaded.items.map((row) => row.id)).toEqual([9, 8, 7, 6, 5]);
    expect(loaded.nextCursor).toBe("c");
  });

  it("gives up after the cap and keeps the cursor so the reader can continue", async () => {
    let n = 0;
    const fetchPage = vi.fn<FetchPage>(async () => ({ items: [crawler(++n)], nextCursor: `c${n}` }));

    const loaded = await loadUntilVisible(fetchPage, "start", "human", 3);

    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(loaded.items).toHaveLength(3);
    expect(loaded.nextCursor).toBe("c3");
  });

  it("stops when the server has nothing older", async () => {
    const fetchPage = vi.fn<FetchPage>(async () => ({ items: [crawler(1)], nextCursor: null }));

    const loaded = await loadUntilVisible(fetchPage, null, "excluded", 5);

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(loaded.nextCursor).toBeNull();
  });

  it("looks for excluded clicks when that view is open", async () => {
    const pages = [
      { items: [human(3)], nextCursor: "a" },
      { items: [excluded(2)], nextCursor: "b" },
    ];
    const fetchPage = vi.fn<FetchPage>(async () => pages.shift()!);

    const loaded = await loadUntilVisible(fetchPage, null, "excluded", 5);

    expect(loaded.items.map((row) => row.id)).toEqual([3, 2]);
    expect(loaded.nextCursor).toBe("b");
  });
});

describe("the cues in a row", () => {
  it("place lists city, region and country once each", () => {
    expect(clickPlace(event({ city: "Seongnam-si" }), labels, "Gyeonggi-do")).toBe(
      "Seongnam-si, Gyeonggi-do, South Korea",
    );
    expect(clickPlace(event({ city: "Seoul" }), labels, "seoul")).toBe("Seoul, South Korea");
    expect(clickPlace(event({ city: null, country: null }), labels, null)).toBe("—");
  });

  it("device keeps the real device of an excluded click instead of a bot label", () => {
    expect(clickDevice(excluded(1).click, labels)).toBe("device.mobile · iOS · Safari");
    expect(clickDevice(event({ device: null, os: null, browser: null }), labels)).toBe("—");
  });

  it("source prefers the referring host, then the channel", () => {
    expect(clickSource(event({ referrerHost: "instagram.com", channel: "social" }), labels)).toBe("instagram.com");
    expect(clickSource(event({ channel: "direct" }), labels)).toBe("channel.direct");
    expect(clickSource(event({ channel: null }), labels)).toBe("—");
  });
});
