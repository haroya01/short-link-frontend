import { describe, expect, it } from "vitest";
import { buildDemoLinkStats } from "./demo-data";

/**
 * /demo renders the same {@code StatsBody} the dashboard's stats page does — 100% mirror, only
 * data and the sample banner differ. These tests lock in the shape invariants so a future
 * refactor doesn't silently break the demo (e.g. a missing required field would render as NaN
 * or crash the chart machinery).
 */
describe("buildDemoLinkStats", () => {
  it("returns 30 days of daily clicks in chronological order", () => {
    const stats = buildDemoLinkStats();
    expect(stats.dailyClicks).toHaveLength(30);
    const dates = stats.dailyClicks.map((d) => d.date);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it("yields identical numbers across calls — seeded LCG is deterministic", () => {
    const a = buildDemoLinkStats();
    const b = buildDemoLinkStats();
    expect(a).toEqual(b);
  });

  it("totalClicks = humanClicks + botClicks", () => {
    const stats = buildDemoLinkStats();
    expect(stats.totalClicks).toBe(stats.humanClicks + stats.botClicks);
    // Bot floor is hardcoded; if we ever make it configurable, this asserts the current contract.
    expect(stats.botClicks).toBe(184);
  });

  it("humanClicks equals the sum of dailyClicks counts", () => {
    const stats = buildDemoLinkStats();
    const sum = stats.dailyClicks.reduce((s, d) => s + d.count, 0);
    expect(stats.humanClicks).toBe(sum);
  });

  it("uniqueClicks is bounded by humanClicks", () => {
    const stats = buildDemoLinkStats();
    expect(stats.uniqueClicks).toBeLessThanOrEqual(stats.humanClicks);
    expect(stats.uniqueClicks).toBeGreaterThan(0);
  });

  it("heatmap has 7×24 = 168 cells with DayOfWeek enum labels (not numeric strings)", () => {
    const stats = buildDemoLinkStats();
    expect(stats.heatmap).toHaveLength(168);
    // The Heatmap renderer keys its grid by Java DayOfWeek enum names. If we ever drift back to
    // numeric strings ("0".."6") every cell will resolve to undefined → 0 → bg-slate-50 and the
    // /demo heatmap renders empty — the regression that triggered this rewrite.
    const validDays = new Set([
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ]);
    for (const cell of stats.heatmap) {
      expect(validDays.has(cell.dayOfWeek)).toBe(true);
      expect(cell.hour).toBeGreaterThanOrEqual(0);
      expect(cell.hour).toBeLessThanOrEqual(23);
      expect(cell.count).toBeGreaterThanOrEqual(0);
    }
  });

  it("heatmap covers all 7 days × 24 hours uniquely (no duplicates, no gaps)", () => {
    const stats = buildDemoLinkStats();
    const keys = new Set(stats.heatmap.map((c) => `${c.dayOfWeek}-${c.hour}`));
    expect(keys.size).toBe(168);
  });

  it("heatmap reflects Korean prime-time bump (19–23h has higher counts than dead-zone 02–06h)", () => {
    const stats = buildDemoLinkStats();
    const primeAvg = avg(
      stats.heatmap.filter((c) => c.hour >= 19 && c.hour <= 23).map((c) => c.count),
    );
    const deadAvg = avg(
      stats.heatmap.filter((c) => c.hour >= 2 && c.hour <= 6).map((c) => c.count),
    );
    expect(primeAvg).toBeGreaterThan(deadAvg * 3);
  });

  it("heatmap weekend evenings (Sat/Sun 19–23h) read hotter than weekday lunch (Mon–Fri 11–14h)", () => {
    const stats = buildDemoLinkStats();
    const weekendEve = avg(
      stats.heatmap
        .filter(
          (c) =>
            (c.dayOfWeek === "SATURDAY" || c.dayOfWeek === "SUNDAY") &&
            c.hour >= 19 &&
            c.hour <= 23,
        )
        .map((c) => c.count),
    );
    const weekdayLunch = avg(
      stats.heatmap
        .filter(
          (c) =>
            c.dayOfWeek !== "SATURDAY" &&
            c.dayOfWeek !== "SUNDAY" &&
            c.hour >= 11 &&
            c.hour <= 14,
        )
        .map((c) => c.count),
    );
    expect(weekendEve).toBeGreaterThan(weekdayLunch);
  });

  it("countryClicks puts KR first and >50% of human clicks (Korean-focused demo)", () => {
    const stats = buildDemoLinkStats();
    expect(stats.countryClicks[0].country).toBe("KR");
    expect(stats.countryClicks[0].count).toBeGreaterThan(stats.humanClicks * 0.5);
  });

  it("exposes the full LinkStats surface so StatsBody can render it without branching", () => {
    const stats = buildDemoLinkStats();
    // Sanity: every chart fed by /stats/[code] reads from one of these arrays — if any drops to
    // undefined, the dashboard 'demo' route would crash. A non-empty assertion is enough; the
    // shape contract is enforced by TypeScript on buildDemoLinkStats's return type.
    expect(stats.shortCode).toBeTruthy();
    expect(stats.timezone).toBeTruthy();
    expect(stats.hourClicks).toHaveLength(24);
    expect(stats.dayOfWeekClicks).toHaveLength(7);
    expect(stats.referrerHostClicks.length).toBeGreaterThan(0);
    expect(stats.channelClicks.length).toBeGreaterThan(0);
    expect(stats.deviceClicks.length).toBeGreaterThan(0);
    expect(stats.osClicks.length).toBeGreaterThan(0);
    expect(stats.browserClicks.length).toBeGreaterThan(0);
    expect(stats.botClicks2.length).toBeGreaterThan(0);
    expect(stats.utmSourceClicks.length).toBeGreaterThan(0);
    expect(stats.destinationClicks.length).toBeGreaterThan(0);
    expect(stats.regionClicks.length).toBeGreaterThan(0);
    expect(stats.cityClicks.length).toBeGreaterThan(0);
    expect(stats.languageClicks.length).toBeGreaterThan(0);
    expect(stats.asnClicks.length).toBeGreaterThan(0);
    expect(stats.velocity.ratio).toBeGreaterThan(0);
  });
});

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}
