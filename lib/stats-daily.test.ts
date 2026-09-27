import { describe, expect, it } from "vitest";
import { fillDailyClicks } from "./stats-daily";
import { buildJournal } from "./stats-journal";
import type { LinkStats } from "@/types";

describe("calendar-day link statistics", () => {
  const now = new Date("2026-09-06T10:00:00Z");

  it("keeps clicks from three weeks ago outside 7D and fills idle days", () => {
    const daily = fillDailyClicks([
      { date: "2026-08-15", count: 20 },
      { date: "2026-09-05", count: 3 },
    ], { now });
    expect(daily).toHaveLength(30);
    expect(daily.slice(-7)).toEqual([
      { date: "2026-08-31", count: 0 },
      { date: "2026-09-01", count: 0 },
      { date: "2026-09-02", count: 0 },
      { date: "2026-09-03", count: 0 },
      { date: "2026-09-04", count: 0 },
      { date: "2026-09-05", count: 3 },
      { date: "2026-09-06", count: 0 },
    ]);
  });

  it("anchors the end date in the report timezone and keeps DST dates contiguous", () => {
    const boundary = new Date("2026-09-06T00:30:00Z");
    expect(fillDailyClicks([], { days: 1, now: boundary, timezone: "Asia/Seoul" })[0].date).toBe("2026-09-06");
    expect(fillDailyClicks([], { days: 1, now: boundary, timezone: "America/Los_Angeles" })[0].date).toBe("2026-09-05");
    expect(fillDailyClicks([], { days: 3, now: new Date("2026-03-09T12:00:00Z"), timezone: "America/New_York" }).map((point) => point.date)).toEqual(["2026-03-07", "2026-03-08", "2026-03-09"]);
  });

  it("makes journal week-over-week comparisons include zero-click days", () => {
    const dailyClicks = fillDailyClicks([
      { date: "2026-08-25", count: 20 },
      { date: "2026-09-05", count: 10 },
    ], { now });
    const entries = buildJournal({ totalClicks: 30, dailyClicks } as LinkStats);
    expect(entries.find((entry) => entry.key === "trendDown")?.params).toEqual({ percent: 50, count: 10 });
  });

  it("excludes the backend's partial 31st day and future dates", () => {
    const daily = fillDailyClicks([
      { date: "2026-08-07", count: 999 },
      { date: "2026-08-08", count: 2 },
      { date: "2026-09-07", count: 999 },
    ], { now });
    expect(daily[0]).toEqual({ date: "2026-08-08", count: 2 });
    expect(daily.reduce((sum, point) => sum + point.count, 0)).toBe(2);
  });
});
