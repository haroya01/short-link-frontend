import { describe, expect, it } from "vitest";
import { buildJournal } from "./stats-journal";
import type { LinkStats } from "@/types";

function stats(overrides: Record<string, unknown>): LinkStats {
  return {
    totalClicks: 100,
    humanClicks: 90,
    botClicks: 10,
    dailyClicks: [],
    referrerHostClicks: [],
    countryClicks: [],
    deviceClicks: [],
    peakHour: null,
    timeToFirstClickMinutes: null,
    velocity: { ratio: 0 },
    ...overrides,
  } as unknown as LinkStats;
}

describe("buildJournal", () => {
  it("클릭 0 이면 문장 없음 (빈 상태는 별도 표면 소유)", () => {
    expect(buildJournal(stats({ totalClicks: 0 }))).toHaveLength(0);
  });

  it("가드 미충족 룰은 문장을 만들지 않는다 — 과장 금지", () => {
    // 유입 지분 25% 미만, 봇 5% 미만, 속도 평범
    const entries = buildJournal(
      stats({
        botClicks: 2,
        humanClicks: 98,
        referrerHostClicks: [
          { host: "a.com", count: 10 },
          { host: "b.com", count: 9 },
          { host: "c.com", count: 8 },
          { host: "d.com", count: 8 },
          { host: "e.com", count: 8 },
        ],
      }),
    );
    expect(entries.find((e) => e.key === "topSource")).toBeUndefined();
    expect(entries.find((e) => e.key.startsWith("bot"))).toBeUndefined();
  });

  it("추세는 직전 7일이 있어야만 말한다", () => {
    const flat14 = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      count: i < 7 ? 0 : 10,
    }));
    // prev7=0 → trend 문장 금지 (0에서의 증가율은 거짓말)
    const entries = buildJournal(stats({ dailyClicks: flat14 }));
    expect(entries.find((e) => e.key === "trendUp")).toBeUndefined();
  });

  it("중요도 정렬 + 상위 5개 캡", () => {
    const entries = buildJournal(
      stats({
        velocity: { ratio: 2.1 },
        peakHour: 21,
        timeToFirstClickMinutes: 5,
        botClicks: 25,
        humanClicks: 75,
        returnRate: { newVisitors: 60, returningVisitors: 40, ratio: 0.4 },
        dailyClicks: Array.from({ length: 14 }, (_, i) => ({
          date: `2026-07-${String(i + 1).padStart(2, "0")}`,
          count: i === 13 ? 50 : 10,
        })),
        referrerHostClicks: [{ host: "x.com", count: 80 }, { host: "b.com", count: 20 }],
        countryClicks: [{ country: "KR", count: 90 }, { country: "JP", count: 10 }],
        deviceClicks: [{ device: "Mobile", count: 80 }, { device: "Desktop", count: 20 }],
      }),
    );
    expect(entries).toHaveLength(5);
    expect(entries[0].key).toBe("velocity");
    const weights = entries.map((e) => e.weight);
    expect([...weights].sort((a, b) => b - a)).toEqual(weights);
  });

  it("피크 날짜는 MM-DD, 스파크는 피크까지의 조각", () => {
    const entries = buildJournal(
      stats({
        dailyClicks: [
          { date: "2026-07-01", count: 1 },
          { date: "2026-07-02", count: 9 },
          { date: "2026-07-03", count: 3 },
        ],
      }),
    );
    const peak = entries.find((e) => e.key === "peakDay");
    expect(peak?.params.date).toBe("07-02");
    expect(peak?.params.count).toBe(9);
    expect(peak?.spark).toEqual([1, 9]);
  });
});
