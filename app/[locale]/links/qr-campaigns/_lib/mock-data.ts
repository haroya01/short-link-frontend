export type MockRow = { name: string; area: string; dist: string; qty: number };
export type MockArea = { label: string; clicks: number };
export type MockCase = {
  biz: string;
  area: string;
  action: string;
  before: number;
  after: number;
};

export type MockData = {
  campaignName: string;
  rows: MockRow[];
  areas: MockArea[];
  recoQty: number;
  cases: MockCase[];
};

export type RankedArea = MockArea & { qty: number; per100: number };

export type MockSummary = {
  distributed: number;
  clicks: number;
  per100: number;
  areas: RankedArea[];
  best: RankedArea;
  worst: RankedArea;
  recoGain: number;
};

export function summarize(mock: MockData): MockSummary {
  const qtyByArea = new Map<string, number>();
  for (const row of mock.rows) qtyByArea.set(row.area, (qtyByArea.get(row.area) ?? 0) + row.qty);
  const distributed = mock.rows.reduce((n, row) => n + row.qty, 0);
  const clicks = mock.areas.reduce((n, area) => n + area.clicks, 0);
  const areas = mock.areas
    .map((area) => {
      const qty = qtyByArea.get(area.label) ?? 0;
      return { ...area, qty, per100: qty > 0 ? (area.clicks / qty) * 100 : 0 };
    })
    .sort((a, b) => b.per100 - a.per100);
  const best = areas[0];
  const worst = areas[areas.length - 1];
  return {
    distributed,
    clicks,
    per100: distributed > 0 ? (clicks / distributed) * 100 : 0,
    areas,
    best,
    worst,
    recoGain: Math.round((mock.recoQty * (best.per100 - worst.per100)) / 100),
  };
}

const DAY_MS = 86_400_000;

function buildDay(): number {
  const built = Date.parse(`${process.env.NEXT_PUBLIC_BUILD_DATE ?? ""}T00:00:00Z`);
  return Number.isNaN(built) ? Date.UTC(2026, 8, 28) : built;
}

export const CAMPAIGN_END = new Date(buildDay());
export const CAMPAIGN_START = new Date(buildDay() - 2 * DAY_MS);

export const MOCK_BY_LOCALE: Record<string, MockData> = {
  ja: {
    campaignName: "2026 春チラシ",
    rows: [
      { name: "渋谷○丁目 北", area: "渋谷", dist: "業者 A", qty: 1500 },
      { name: "渋谷○丁目 南", area: "渋谷", dist: "業者 A", qty: 1000 },
      { name: "新宿○町", area: "新宿", dist: "業者 B", qty: 2500 },
      { name: "池袋駅前", area: "池袋", dist: "業者 C", qty: 5000 },
    ],
    areas: [
      { label: "渋谷", clicks: 142 },
      { label: "池袋", clicks: 91 },
      { label: "新宿", clicks: 38 },
    ],
    recoQty: 2000,
    cases: [
      { biz: "ラーメン店 コロネ", area: "渋谷区", action: "1番出口集中", before: 28, after: 142 },
      { biz: "美容室 アルプス", area: "新宿区", action: "動線変更", before: 47, after: 137 },
      { biz: "学習塾 ZONE", area: "池袋", action: "バッチ再構成", before: 61, after: 119 },
    ],
  },
  ko: {
    campaignName: "2026 봄 전단지",
    rows: [
      { name: "강남 1출구", area: "강남", dist: "알바 A", qty: 250 },
      { name: "강남 2출구", area: "강남", dist: "알바 A", qty: 250 },
      { name: "신촌 로타리", area: "신촌", dist: "알바 B", qty: 500 },
      { name: "홍대 정문", area: "홍대", dist: "알바 C", qty: 500 },
    ],
    areas: [
      { label: "강남", clicks: 80 },
      { label: "홍대", clicks: 47 },
      { label: "신촌", clicks: 5 },
    ],
    recoQty: 500,
    cases: [
      { biz: "라멘집 코로네", area: "강남", action: "1출구 집중", before: 28, after: 142 },
      { biz: "미용실 알프스", area: "신촌", action: "동선 변경", before: 47, after: 137 },
      { biz: "학원 ZONE", area: "홍대", action: "묶음 재구성", before: 61, after: 119 },
    ],
  },
  en: {
    campaignName: "2026 Spring drop",
    rows: [
      { name: "Shibuya N", area: "Shibuya", dist: "Vendor A", qty: 1500 },
      { name: "Shibuya S", area: "Shibuya", dist: "Vendor A", qty: 1000 },
      { name: "Shinjuku", area: "Shinjuku", dist: "Vendor B", qty: 2500 },
      { name: "Ikebukuro", area: "Ikebukuro", dist: "Vendor C", qty: 5000 },
    ],
    areas: [
      { label: "Shibuya", clicks: 142 },
      { label: "Ikebukuro", clicks: 91 },
      { label: "Shinjuku", clicks: 38 },
    ],
    recoQty: 2000,
    cases: [
      { biz: "Ramen · Korone", area: "Shibuya", action: "Exit 1 focus", before: 28, after: 142 },
      { biz: "Salon · Alps", area: "Shinjuku", action: "Reroute foot traffic", before: 47, after: 137 },
      { biz: "Cram · ZONE", area: "Ikebukuro", action: "Batch reshuffle", before: 61, after: 119 },
    ],
  },
};

export const SECTION_COUNT = 6;
export const EASE = "cubic-bezier(0.16,1,0.3,1)";
