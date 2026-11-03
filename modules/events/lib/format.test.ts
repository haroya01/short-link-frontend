import { describe, expect, it } from "vitest";
import { eventWhenText, formatEventRange } from "./format";

const KO = { am: "오전", pm: "오후" };
const JA = { am: "午前", pm: "午後" };
const EN = { am: "AM", pm: "PM" };
const evening = { startsAt: "2026-11-12T10:00:00Z", endsAt: "2026-11-12T12:00:00Z" };
const overnight = { startsAt: "2026-08-13T11:14:00Z", endsAt: "2026-08-15T00:17:00Z" };

describe("eventWhenText", () => {
  it("writes ko with 오전/오후 whatever the runtime's ICU calls the day period", () => {
    expect(eventWhenText({ ...evening, timezone: "Asia/Seoul" }, "ko", KO)).toEqual({
      day: "2026년 11월 12일 (목)",
      time: "오후 7:00 – 오후 9:00",
      zone: "대한민국 시간",
    });
    expect(eventWhenText({ ...overnight, timezone: "Asia/Seoul" }, "ko", KO)).toEqual({
      day: "2026년 8월 13일 (목) 오후 8:14 –",
      time: "2026년 8월 15일 (토) 오전 9:17",
      zone: "대한민국 시간",
    });
  });

  it("writes ja on the 24-hour clock with the weekday right after the date", () => {
    expect(eventWhenText({ ...evening, timezone: "Asia/Tokyo" }, "ja", JA)).toEqual({
      day: "2026年11月12日(木)",
      time: "19:00〜21:00",
      zone: "JST",
    });
  });

  it("writes en without a stray comma before the month", () => {
    expect(eventWhenText({ ...evening, timezone: "Asia/Seoul" }, "en", EN)).toEqual({
      day: "November 12, 2026 (Thu)",
      time: "7:00\u202fPM – 9:00\u202fPM",
      zone: "South Korea Time",
    });
  });

  it("takes the day-period words from the caller, not from ICU", () => {
    expect(eventWhenText({ ...evening, timezone: "Asia/Seoul" }, "ko", { am: "A", pm: "P" }).time).toBe("P 7:00 – P 9:00");
    expect(eventWhenText({ startsAt: "2026-11-12T00:30:00Z", endsAt: null, timezone: "Asia/Seoul" }, "ko", KO).time).toBe(
      "오전 9:30",
    );
  });
});

describe("formatEventRange", () => {
  it("uses the same day-period words in the list line", () => {
    expect(formatEventRange(evening.startsAt, evening.endsAt, "Asia/Seoul", "ko", KO)).toBe(
      "2026년 11월 12일 (목) · 오후 7:00 – 오후 9:00",
    );
  });
});
