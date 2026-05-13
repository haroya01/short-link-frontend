import { describe, expect, it } from "vitest";
import { buildDemoStats } from "./demo-data";

/**
 * The demo data is rendered by the public /demo page using the same chart components as real
 * LinkStats. These tests lock in the shape invariants so a future refactor doesn't silently
 * break the demo (e.g. a new required field on DailyClick / HeatmapCell would render as NaN).
 */
describe("buildDemoStats", () => {
  it("returns 30 days of daily clicks in chronological order", () => {
    const stats = buildDemoStats();
    expect(stats.dailyClicks).toHaveLength(30);
    const dates = stats.dailyClicks.map((d) => d.date);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it("yields identical numbers across calls — seeded LCG is deterministic", () => {
    const a = buildDemoStats();
    const b = buildDemoStats();
    expect(a).toEqual(b);
  });

  it("totalClicks = humanClicks + botClicks bot floor", () => {
    const stats = buildDemoStats();
    expect(stats.totalClicks).toBe(stats.humanClicks + stats.botClicks);
    // Bot floor is hardcoded; if we ever make it configurable, this asserts the current contract.
    expect(stats.botClicks).toBe(184);
  });

  it("humanClicks equals the sum of dailyClicks counts", () => {
    const stats = buildDemoStats();
    const sum = stats.dailyClicks.reduce((s, d) => s + d.count, 0);
    expect(stats.humanClicks).toBe(sum);
  });

  it("uniqueClicks is bounded by humanClicks", () => {
    const stats = buildDemoStats();
    expect(stats.uniqueClicks).toBeLessThanOrEqual(stats.humanClicks);
    expect(stats.uniqueClicks).toBeGreaterThan(0);
  });

  it("heatmap has 7×24 = 168 cells with valid dow/hour ranges", () => {
    const stats = buildDemoStats();
    expect(stats.heatmap).toHaveLength(168);
    for (const cell of stats.heatmap) {
      const dow = Number(cell.dayOfWeek);
      expect(dow).toBeGreaterThanOrEqual(0);
      expect(dow).toBeLessThanOrEqual(6);
      expect(cell.hour).toBeGreaterThanOrEqual(0);
      expect(cell.hour).toBeLessThanOrEqual(23);
      expect(cell.count).toBeGreaterThanOrEqual(0);
    }
  });

  it("heatmap reflects Korean prime-time bump (19–23h has higher counts than dead-zone 02–06h)", () => {
    const stats = buildDemoStats();
    // Average count across the prime-time band vs the dead-zone band — chart trustworthiness
    // depends on this shape, not absolute numbers.
    const primeAvg = avg(stats.heatmap.filter((c) => c.hour >= 19 && c.hour <= 23).map((c) => c.count));
    const deadAvg = avg(stats.heatmap.filter((c) => c.hour >= 2 && c.hour <= 6).map((c) => c.count));
    expect(primeAvg).toBeGreaterThan(deadAvg * 3);
  });

  it("utmSourceClicks sums to ~100% of humanClicks (fractions sum to 1, rounding tolerated)", () => {
    const stats = buildDemoStats();
    const sum = stats.utmSourceClicks.reduce((s, u) => s + u.count, 0);
    // Six independent Math.round calls of fractional bucket counts — total can drift a few
    // counts in either direction. Lock the chart-trustworthiness invariant ("the breakdown
    // matches roughly the whole") rather than asserting exact equality.
    expect(Math.abs(sum - stats.humanClicks)).toBeLessThan(stats.humanClicks * 0.02);
  });

  it("countryClicks puts KR first and >50% of human clicks (Korean-focused demo)", () => {
    const stats = buildDemoStats();
    expect(stats.countryClicks[0].country).toBe("KR");
    expect(stats.countryClicks[0].count).toBeGreaterThan(stats.humanClicks * 0.5);
  });
});

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}
