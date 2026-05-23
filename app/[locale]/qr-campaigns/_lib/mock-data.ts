export type MockRow = { name: string; area: string; dist: string; qty: number };
export type MockBar = { label: string; value: number };
export type MockCase = {
  biz: string;
  area: string;
  action: string;
  before: number;
  after: number;
  multiplier: string;
};

export type MockData = {
  campaignName: string;
  distributedValue: string;
  // §1 KPI After-kurl 값 — Before 와 같은 캠페인의 *kurl 도입 후* KPI
  afterClicks: number;
  afterPer100: string;
  afterTopArea: string;
  rows: MockRow[];
  bars: MockBar[];
  reco: string;
  cases: MockCase[];
  startDate: string;
  endDate: string;
};

export const MOCK_BY_LOCALE: Record<string, MockData> = {
  ja: {
    campaignName: "2026 春チラシ",
    distributedValue: "10,000",
    afterClicks: 271,
    afterPer100: "2.7",
    afterTopArea: "渋谷",
    rows: [
      { name: "渋谷○丁目 北", area: "渋谷", dist: "業者 A", qty: 1500 },
      { name: "渋谷○丁目 南", area: "渋谷", dist: "業者 A", qty: 1000 },
      { name: "新宿○町", area: "新宿", dist: "業者 B", qty: 2500 },
      { name: "池袋駅前", area: "池袋", dist: "業者 C", qty: 5000 },
    ],
    bars: [
      { label: "渋谷", value: 142 },
      { label: "池袋", value: 91 },
      { label: "新宿", value: 38 },
    ],
    reco: "渋谷 +3,000 / 新宿 -2,000",
    cases: [
      { biz: "ラーメン店 コロネ", area: "渋谷区", action: "1番出口集中", before: 28, after: 142, multiplier: "+5x" },
      { biz: "美容室 アルプス", area: "新宿区", action: "動線変更", before: 47, after: 137, multiplier: "+3x" },
      { biz: "学習塾 ZONE", area: "池袋", action: "バッチ再構成", before: 61, after: 119, multiplier: "+2x" },
    ],
    startDate: "2026-05-25",
    endDate: "2026-05-27",
  },
  ko: {
    campaignName: "2026 봄 전단지",
    distributedValue: "1,000",
    afterClicks: 80,
    afterPer100: "8.0",
    afterTopArea: "강남",
    rows: [
      { name: "강남 1출구", area: "강남", dist: "알바 A", qty: 250 },
      { name: "강남 2출구", area: "강남", dist: "알바 A", qty: 250 },
      { name: "신촌 로타리", area: "신촌", dist: "알바 B", qty: 500 },
      { name: "홍대 정문", area: "홍대", dist: "알바 C", qty: 500 },
    ],
    bars: [
      { label: "강남", value: 80 },
      { label: "홍대", value: 47 },
      { label: "신촌", value: 5 },
    ],
    reco: "강남 +750 / 신촌 -250",
    cases: [
      { biz: "라멘집 코로네", area: "강남", action: "1출구 집중", before: 28, after: 142, multiplier: "+5x" },
      { biz: "미용실 알프스", area: "신촌", action: "동선 변경", before: 47, after: 137, multiplier: "+3x" },
      { biz: "학원 ZONE", area: "홍대", action: "묶음 재구성", before: 61, after: 119, multiplier: "+2x" },
    ],
    startDate: "2026-05-25",
    endDate: "2026-05-27",
  },
  en: {
    campaignName: "2026 Spring drop",
    distributedValue: "10,000",
    afterClicks: 271,
    afterPer100: "2.7",
    afterTopArea: "Shibuya",
    rows: [
      { name: "Shibuya N", area: "Shibuya", dist: "Vendor A", qty: 1500 },
      { name: "Shibuya S", area: "Shibuya", dist: "Vendor A", qty: 1000 },
      { name: "Shinjuku", area: "Shinjuku", dist: "Vendor B", qty: 2500 },
      { name: "Ikebukuro", area: "Ikebukuro", dist: "Vendor C", qty: 5000 },
    ],
    bars: [
      { label: "Shibuya", value: 142 },
      { label: "Ikebukuro", value: 91 },
      { label: "Shinjuku", value: 38 },
    ],
    reco: "Shibuya +3,000 / Shinjuku -2,000",
    cases: [
      { biz: "Ramen · Korone", area: "Shibuya", action: "Exit 1 focus", before: 28, after: 142, multiplier: "+5x" },
      { biz: "Salon · Alps", area: "Shinjuku", action: "Reroute foot traffic", before: 47, after: 137, multiplier: "+3x" },
      { biz: "Cram · ZONE", area: "Ikebukuro", action: "Batch reshuffle", before: 61, after: 119, multiplier: "+2x" },
    ],
    startDate: "2026-05-25",
    endDate: "2026-05-27",
  },
};

export const AUTOPLAY_MS = 4000;
export const SECTION_COUNT = 6;
export const EASE = "cubic-bezier(0.16,1,0.3,1)";
