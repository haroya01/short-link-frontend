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

  it("sharedLinks renders at least one hot card so the ping pulse is visible on /demo", () => {
    const stats = buildDemoStats();
    // Ping animation is gated on `hot` — locking this contract keeps the viral section from
    // silently rendering an all-static silhouette when the synthetic data is tuned.
    expect(stats.sharedLinks.length).toBeGreaterThanOrEqual(2);
    expect(stats.sharedLinks.some((s) => s.hot)).toBe(true);
    for (const s of stats.sharedLinks) {
      expect(s.slug).toMatch(/^[a-z0-9-]+$/);
      expect(s.clicks).toBeGreaterThan(0);
    }
  });

  it("sharedLinks click counts decrease so the first card reads as the hottest share", () => {
    const stats = buildDemoStats();
    const clicks = stats.sharedLinks.map((s) => s.clicks);
    const sorted = [...clicks].sort((a, b) => b - a);
    expect(clicks).toEqual(sorted);
  });

  it("profile silhouette exposes a handle plus all four archetype shapes for the /demo preview", () => {
    const stats = buildDemoStats();
    expect(stats.profile.handle).toMatch(/^[a-z0-9-]+$/);
    expect(stats.profile.links.length).toBeGreaterThanOrEqual(4);
    const shapes = new Set(stats.profile.links.map((l) => l.shape));
    // At minimum: the four AGENTS.md archetypes the silhouette is meant to telegraph.
    expect(shapes.has("highlight")).toBe(true);
    expect(shapes.has("embed")).toBe(true);
    expect(shapes.has("place")).toBe(true);
    expect(shapes.has("contact")).toBe(true);
  });
});

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}
