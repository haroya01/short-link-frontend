import { describe, expect, it } from "vitest";
import { compactTime } from "./compact-time";

const NOW = Date.parse("2026-10-06T12:00:00Z");
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

describe("compactTime", () => {
  it("counts minutes, hours and days in the short unit form", () => {
    expect(compactTime(ago(30 * 60), "ko", NOW)).toBe("30분");
    expect(compactTime(ago(2 * 3600), "ko", NOW)).toBe("2시간");
    expect(compactTime(ago(3 * 86_400), "ko", NOW)).toBe("3일");
    expect(compactTime(ago(30 * 60), "en", NOW)).toBe("30m");
    expect(compactTime(ago(2 * 3600), "en", NOW)).toBe("2h");
    expect(compactTime(ago(30 * 60), "ja", NOW)).toBe("30分");
    expect(compactTime(ago(2 * 3600), "ja", NOW)).toBe("2時間");
  });

  it("rounds down so 59 minutes is still minutes and anything under a minute is now", () => {
    expect(compactTime(ago(59 * 60 + 59), "ko", NOW)).toBe("59분");
    expect(compactTime(ago(10), "ko", NOW)).toBe("지금");
    expect(compactTime(new Date(NOW + 5000).toISOString(), "en", NOW)).toBe("now");
  });

  it("falls back to a date after a week, with the year only when it differs", () => {
    expect(compactTime("2026-09-20T12:00:00Z", "ko", NOW)).toBe("9월 20일");
    expect(compactTime("2025-09-20T12:00:00Z", "ko", NOW)).toBe("2025년 9월 20일");
  });
});
