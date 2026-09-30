export type MockRow = { name: string; area: string; dist: string; qty: number };
export type MockArea = { label: string; clicks: number };

/** Example flyer batches and their clicks per area, localized so the place names read as home. */
export type MockData = {
  rows: MockRow[];
  areas: MockArea[];
  /** Flyers the recommendation moves from the weakest area to the strongest. */
  recoQty: number;
};

export const MOCK_BY_LOCALE: Record<string, MockData> = {
  ja: {
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
  },
  ko: {
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
  },
  en: {
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
  },
};
