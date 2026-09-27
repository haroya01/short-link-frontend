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

  it("인앱 브라우저는 사람 클릭 대비 20% 문턱 — 앱 이름은 카탈로그 키로 넘긴다", () => {
    const under = buildJournal(
      stats({ humanClicks: 100, clientAppClicks: [{ app: "kakaotalk", count: 19 }] }),
    );
    expect(under.find((e) => e.key === "inAppBrowser")).toBeUndefined();

    const over = buildJournal(
      stats({
        humanClicks: 100,
        clientAppClicks: [
          { app: "instagram", count: 9 },
          { app: "kakaotalk", count: 12 },
        ],
      }),
    );
    const entry = over.find((e) => e.key === "inAppBrowser");
    // 합이 21% 이고, 1등은 배열 첫 항목이 아니라 최다 클릭(kakaotalk).
    expect(entry?.params).toEqual({ app: "clientApp.kakaotalk", percent: 21 });
    expect(entry?.translatedParams).toEqual(["app"]);
  });

  it("모르는 인앱 앱은 번역을 시도하지 않고 원값 그대로", () => {
    const entries = buildJournal(
      stats({ humanClicks: 100, clientAppClicks: [{ app: "somenewapp", count: 40 }] }),
    );
    const entry = entries.find((e) => e.key === "inAppBrowser");
    expect(entry?.params.app).toBe("somenewapp");
    expect(entry?.translatedParams).toBeUndefined();
  });

  it("채널 충성도는 재방문율 1등을 집고, 표본 하한 미달은 무시한다", () => {
    const entries = buildJournal(
      stats({
        channelDepth: [
          // 재방문율은 제일 높지만 재방문자 4명 — 잡음이라 후보에서 뺀다.
          { host: "tiny.example", count: 9, firstSeenAt: "", returningVisitors: 4, returnRatio: 0.9 },
          { host: "notion.site", count: 120, firstSeenAt: "", returningVisitors: 41, returnRatio: 0.41 },
          // 클릭 1등이지만 한 번 터지고 끝난 채널.
          {
            host: "instagram.com",
            count: 400,
            firstSeenAt: "",
            returningVisitors: 38,
            returnRatio: 0.11,
          },
        ],
      }),
    );
    const entry = entries.find((e) => e.key === "channelLoyalty");
    expect(entry?.params).toEqual({ host: "notion.site", percent: 41 });
  });

  it("채널 충성도가 서면 링크 전체 재방문 문장은 접는다 — 같은 이야기 두 줄 금지", () => {
    const returnRate = { newVisitors: 60, returningVisitors: 40, ratio: 0.4 };
    const loyal = {
      host: "notion.site",
      count: 120,
      firstSeenAt: "",
      returningVisitors: 41,
      returnRatio: 0.41,
    };
    const withChannel = buildJournal(stats({ returnRate, channelDepth: [loyal] }));
    expect(withChannel.find((e) => e.key === "returning")).toBeUndefined();

    // 문턱 미달이면 채널 문장이 안 서므로 링크 전체 재방문 문장이 그대로 남는다.
    const withoutChannel = buildJournal(
      stats({ returnRate, channelDepth: [{ ...loyal, returnRatio: 0.12 }] }),
    );
    expect(withoutChannel.find((e) => e.key === "returning")).toBeDefined();
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
