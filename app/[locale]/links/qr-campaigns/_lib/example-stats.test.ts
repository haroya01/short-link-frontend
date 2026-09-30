import { describe, expect, it } from "vitest";
import { exampleCampaign } from "./example-stats";
import { MOCK_BY_LOCALE } from "./mock-data";

describe("QR landing example", () => {
  it("reads like the stats screen: per-100 rate by area, best first", () => {
    const { stats } = exampleCampaign(MOCK_BY_LOCALE.ko);
    const byArea = [...stats.byArea].sort((a, b) => b.clickRatePerHundred - a.clickRatePerHundred);
    expect(byArea.map((g) => [g.key, g.clickRatePerHundred.toFixed(1)])).toEqual([
      ["강남", "16.0"],
      ["홍대", "9.4"],
      ["신촌", "1.0"],
    ]);
    expect(stats.totalClicks).toBe(132);
  });

  for (const locale of Object.keys(MOCK_BY_LOCALE)) {
    it(`${locale}: the recommendation only moves flyers, it never changes the total`, () => {
      const { recommendation } = exampleCampaign(MOCK_BY_LOCALE[locale]);
      expect(recommendation.recommendations.reduce((n, r) => n + r.delta, 0)).toBe(0);
      expect(recommendation.recommendations.some((r) => r.verdict === "BOOST")).toBe(true);
      expect(recommendation.recommendations.every((r) => r.recommendedQuantity >= 0)).toBe(true);
    });
  }
});
