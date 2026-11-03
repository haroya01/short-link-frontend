import { describe, expect, it } from "vitest";
import { buildJournal, journalEntries } from "./stats-journal";
import { realLinkStats } from "./link-stats-real.fixture";
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

  it("인앱 브라우저는 사람 클릭 대비 20% 문턱, 합계를 말하므로 앱 이름은 싣지 않는다", () => {
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
    expect(over.find((e) => e.key === "inAppBrowser")?.params).toEqual({ percent: 21 });
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

  describe("실제 응답 모양에서 문장의 숫자는 문장이 말하는 대상을 사람 클릭 전체로 나눈다", () => {
    const entry = (key: string, data = realLinkStats()) => buildJournal(data).find((e) => e.key === key);

    it("앱 안 브라우저 합계 349 / 사람 1125 = 31%", () => {
      expect(entry("inAppBrowser")?.params).toEqual({ percent: 31 });
    });

    it("1위 유입원 instagram 383 / 사람 1125 = 34%, 직접 유입이 분모에 들어간다", () => {
      expect(entry("topSource")?.params).toEqual({ host: "instagram.com", percent: 34 });
    });

    it("직접 999 + x.com 1 이면 x.com 을 유입의 대부분이라고 말하지 않는다", () => {
      const data = realLinkStats({
        humanClicks: 1000,
        referrerHostClicks: [{ host: "x.com", count: 1 }],
        channelClicks: [{ channel: "direct", count: 999 }, { channel: "social", count: 1 }],
      });
      expect(entry("topSource", data)).toBeUndefined();
    });

    it("유입 문장은 사람 클릭이 표본 하한(10)보다 적으면 서지 않는다", () => {
      const data = realLinkStats({ humanClicks: 6, referrerHostClicks: [{ host: "x.com", count: 6 }] });
      expect(entry("topSource", data)).toBeUndefined();
    });

    it("미리보기 6번뿐인 링크에 자동 접속 100% 문장을 쓰지 않는다", () => {
      const data = realLinkStats({ totalClicks: 6, humanClicks: 0, botClicks: 6 });
      expect(buildJournal(data).filter((e) => e.key.startsWith("bot"))).toEqual([]);
    });

    it("직전 7일이 표본 하한보다 적으면 추세를 말하지 않는다", () => {
      const days = (prev: number, last: number) =>
        Array.from({ length: 14 }, (_, i) => ({ date: `2026-10-${String(i + 10).padStart(2, "0")}`, count: i < 7 ? (i === 0 ? prev : 0) : i === 13 ? last : 0 }));
      expect(entry("trendUp", realLinkStats({ dailyClicks: days(1, 3) }))).toBeUndefined();
      expect(entry("trendUp", realLinkStats({ dailyClicks: days(20, 30) }))?.params).toEqual({ percent: 50, count: 30 });
    });

    it("데스크톱 문장은 데스크톱 클릭을 센다 — 모바일이 아닌 나머지를 데스크톱이라 부르지 않는다", () => {
      const data = realLinkStats({
        humanClicks: 100,
        deviceClicks: [
          { device: "mobile", count: 30 },
          { device: "desktop", count: 30 },
          { device: "tablet", count: 20 },
          { device: "unknown", count: 20 },
        ],
      });
      expect(entry("desktopHeavy", data)).toBeUndefined();
      expect(entry("mobileHeavy")?.params).toEqual({ percent: 78 });
    });

    it("나라 문장은 '알 수 없음'을 주어로 쓰지 않고 사람 클릭 전체로 나눈다", () => {
      expect(entry("topCountry")?.params).toEqual({ country: "KR", percent: 72 });
      const data = realLinkStats({
        countryClicks: [{ country: "unknown", count: 700 }, { country: "KR", count: 425 }],
      });
      expect(entry("topCountry", data)).toBeUndefined();
    });

    it("재방문 비율은 원본이 남은 기간의 숫자라 그 기간을 문장에 적는다", () => {
      const data = realLinkStats({ returnRate: { newVisitors: 300, returningVisitors: 60, ratio: 0.2 } });
      expect(entry("returningRecent", data)?.params).toEqual({ percent: 20, days: 90 });
      expect(entry("returning", realLinkStats({ rawSince: null, returnRate: { newVisitors: 300, returningVisitors: 60, ratio: 0.2 } }))?.params).toEqual({ percent: 20 });
      expect(entry("returningRecent", realLinkStats({ returnRate: { newVisitors: 4, returningVisitors: 2, ratio: 0.33 } }))).toBeUndefined();
    });
  });
});

describe("journalEntries", () => {
  it("draws the server's facts in the server's order, with the web's param shapes and evidence anchors", () => {
    const entries = journalEntries(
      stats({
        insights: [
          { code: "velocity", params: { x: 2 }, evidence: "hourly", ratio: null, spark: null },
          { code: "peakDay", params: { date: "2026-07-02", count: 41 }, evidence: "daily", spark: [3, 5, 41] },
          { code: "topCountry", params: { country: "KR", percent: 72 }, evidence: "countries", ratio: 0.72 },
          { code: "SOMETHING_NEW", params: {}, evidence: "elsewhere" },
        ],
      }),
    );
    expect(entries.map((e) => [e.key, e.params, e.evidence])).toEqual([
      ["velocity", { x: "2.0" }, "section-hourly"],
      ["peakDay", { date: "07-02", count: 41 }, "section-daily"],
      ["topCountry", { country: "KR", percent: 72 }, "chapter-where"],
    ]);
    expect(entries[1].spark).toEqual([3, 5, 41]);
    expect(entries[2].ratio).toBe(0.72);
  });

  it("an older server without fact codes falls back to the web rules", () => {
    const data = { ...realLinkStats(), insights: [{ code: null, params: null }] } as LinkStats;
    expect(journalEntries(data)).toEqual(buildJournal(data));
    expect(journalEntries(realLinkStats())).toEqual(buildJournal(realLinkStats()));
  });
});

