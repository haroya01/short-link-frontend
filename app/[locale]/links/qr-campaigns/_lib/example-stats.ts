import type { CampaignRecommendation, CampaignStats } from "@/types";
import type { MockData } from "./mock-data";

type Batch = CampaignStats["byBatch"][number];
type Group = CampaignStats["byArea"][number];

function rate(clicks: number, quantity: number): number {
  return quantity > 0 ? (clicks * 100) / quantity : 0;
}

function groupBy(batches: Batch[], keyOf: (b: Batch) => string | null): Group[] {
  const groups = new Map<string, { clicks: number; totalQuantity: number }>();
  for (const b of batches) {
    const key = keyOf(b);
    if (!key) continue;
    const g = groups.get(key) ?? { clicks: 0, totalQuantity: 0 };
    g.clicks += b.clicks;
    g.totalQuantity += b.quantity;
    groups.set(key, g);
  }
  return [...groups].map(([key, g]) => ({
    key,
    clicks: g.clicks,
    totalQuantity: g.totalQuantity,
    clickRatePerHundred: rate(g.clicks, g.totalQuantity),
  }));
}

/**
 * The QR landing's example, shaped as the campaign stats screen's own data so the landing can draw it
 * with the same cards. Each area's clicks are split across its batches by quantity; the recommendation
 * moves the weakest area's flyers to the strongest one, as the landing copy describes.
 */
export function exampleCampaign(mock: MockData): {
  stats: CampaignStats;
  recommendation: CampaignRecommendation;
} {
  const areaClicks = new Map(mock.areas.map((a) => [a.label, a.clicks]));
  const areaQuantity = new Map<string, number>();
  for (const row of mock.rows) areaQuantity.set(row.area, (areaQuantity.get(row.area) ?? 0) + row.qty);

  const byBatch: Batch[] = mock.rows.map((row, i) => {
    const clicks = areaClicks.get(row.area) ?? 0;
    const portion = row.qty / (areaQuantity.get(row.area) ?? row.qty);
    return {
      batchId: i + 1,
      batchName: row.name,
      distributor: row.dist,
      area: row.area,
      quantity: row.qty,
      shortCode: `qr${i + 1}`,
      clicks: Math.round(clicks * portion),
    };
  });
  const byArea = groupBy(byBatch, (b) => b.area);
  const totalClicks = byBatch.reduce((n, b) => n + b.clicks, 0);
  const totalQuantity = byBatch.reduce((n, b) => n + b.quantity, 0);

  const ranked = [...byArea].sort((a, b) => b.clickRatePerHundred - a.clickRatePerHundred);
  const best = ranked[0]?.key;
  const worst = ranked[ranked.length - 1]?.key;
  const share = (b: Batch, area: string | undefined) =>
    area && b.area === area ? Math.round((mock.recoQty * b.quantity) / (areaQuantity.get(area) ?? b.quantity)) : 0;
  const recommendations = byBatch
    .map((b) => {
      const moved = share(b, best) - share(b, worst);
      const verdict: CampaignRecommendation["recommendations"][number]["verdict"] =
        moved > 0 ? "BOOST" : moved < 0 ? (b.quantity + moved <= 0 ? "PRUNE" : "REDUCE") : "KEEP";
      return {
        batchId: b.batchId,
        batchName: b.batchName,
        distributor: b.distributor,
        area: b.area,
        currentQuantity: b.quantity,
        currentClicks: b.clicks,
        currentRatePerHundred: rate(b.clicks, b.quantity),
        recommendedQuantity: b.quantity + moved,
        delta: moved,
        verdict,
      };
    })
    .sort((a, b) => b.delta - a.delta);

  return {
    stats: {
      totalClicks,
      testScans: 0,
      lastTestScanAt: null,
      byBatch,
      byDistributor: groupBy(byBatch, (b) => b.distributor),
      byArea,
      byHour: [],
      byDay: [],
      heatmap: [],
    },
    recommendation: {
      insufficient: false,
      insufficientReason: null,
      totalQuantity,
      totalClicks,
      avgRatePerHundred: rate(totalClicks, totalQuantity),
      recommendations,
    },
  };
}
