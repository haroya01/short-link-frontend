import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { count?: number }) => `${key}:${values?.count}`,
}));

import { LIVE_TODAY_START, LiveToday, arriveToday, crossedDay, ownerDay, todayCount } from "./live-today";

const click = (over: Partial<Parameters<typeof arriveToday>[1]> = {}) => ({
  shortCode: "spr1ng",
  occurredAt: "2026-11-01T14:55:00Z",
  countryCode: "KR",
  deviceClass: "iOS",
  channel: "instagram",
  bot: false,
  ...over,
});

describe("owner day", () => {
  it("reads the calendar day in the owner's time zone", () => {
    expect(ownerDay("2026-11-01T15:30:00Z", "Asia/Seoul")).toBe("2026-11-02");
    expect(ownerDay("2026-11-01T15:30:00Z", "UTC")).toBe("2026-11-01");
  });

  it("gives up on a broken time or zone instead of guessing", () => {
    expect(ownerDay("not a time", "Asia/Seoul")).toBeNull();
    expect(ownerDay("2026-11-01T15:30:00Z", "Mars/Olympus")).toBeNull();
  });

  it("calls a click past the owner's midnight a new day", () => {
    const overview = { updatedAt: "2026-11-01T14:50:00Z", timezone: "Asia/Seoul" };
    expect(crossedDay(click({ occurredAt: "2026-11-01T14:59:59Z" }), overview)).toBe(false);
    expect(crossedDay(click({ occurredAt: "2026-11-01T15:00:00Z" }), overview)).toBe(true);
    expect(crossedDay(click(), undefined)).toBe(false);
    expect(crossedDay(click({ occurredAt: "garbage" }), overview)).toBe(false);
  });
});

describe("today's count", () => {
  it("adds people who arrive on top of the server's number for the same fetch", () => {
    const first = arriveToday(LIVE_TODAY_START, click(), 100, false);
    const second = arriveToday(first, click({ shortCode: "d0cs" }), 100, false);
    expect(second).toMatchObject({ extra: 2, at: 100, seq: 2, latest: { shortCode: "d0cs" } });
    expect(todayCount(412, second, 100)).toBe(414);
  });

  it("drops what it added once a newer server number lands, so nothing is counted twice", () => {
    const before = arriveToday(arriveToday(LIVE_TODAY_START, click(), 100, false), click(), 100, false);
    expect(todayCount(414, before, 200)).toBe(414);
    const after = arriveToday(before, click(), 200, false);
    expect(after.extra).toBe(1);
    expect(todayCount(414, after, 200)).toBe(415);
  });

  it("adds nothing for a click on a new day and waits for the server", () => {
    const before = arriveToday(LIVE_TODAY_START, click(), 100, false);
    const crossed = arriveToday(before, click(), 100, true);
    expect(crossed).toMatchObject({ extra: 0, seq: 2 });
    expect(todayCount(412, crossed, 100)).toBe(412);
  });
});

describe("the live line", () => {
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

  const render = (props: Parameters<typeof LiveToday>[0]) => act(async () => root.render(createElement(LiveToday, props)));
  const line = () => container.querySelector<HTMLElement>('[data-testid="live-today"]')!;
  const dot = () => line().firstElementChild as HTMLElement;

  it("on connect shows only today's number, still, with no arrival detail", async () => {
    await render({ count: 412, latest: null, seq: 0, live: true });
    expect(line().textContent).toBe("liveToday:412");
    expect(line().querySelector(".count-roll")).toBeNull();
    expect(dot().className).not.toContain("live-dot-once");
    expect(line().dataset.live).toBe("on");
  });

  it("rolls the number and names the link, country, device and channel of the click that just landed", async () => {
    await render({ count: 413, latest: click(), seq: 1, live: true });
    expect(line().querySelector(".count-roll")?.textContent).toBe("liveToday:413");
    expect(line().textContent).toContain("/spr1ng · KR · iOS · instagram");
    expect(line().querySelector(".font-mono")?.textContent).toBe("/spr1ng");
    expect(dot().className).toContain("live-dot-once");
  });

  it("keeps the line while the stream reconnects but stops calling it live", async () => {
    await render({ count: 413, latest: click(), seq: 1, live: false });
    expect(line().dataset.live).toBe("off");
    expect(dot().className).not.toContain("bg-accent-500");
    expect(dot().className).not.toContain("live-dot-once");
  });
});
