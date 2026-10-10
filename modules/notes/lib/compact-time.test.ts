import { afterEach, describe, expect, it, vi } from "vitest";
import { compactTime } from "./compact-time";

const intl = vi.hoisted(() => ({ locale: "ko" }));
vi.mock("next-intl", async () => {
  const messages = {
    ko: (await import("@/messages/ko.json")).default,
    en: (await import("@/messages/en.json")).default,
    ja: (await import("@/messages/ja.json")).default,
    hi: (await import("@/messages/hi.json")).default,
    vi: (await import("@/messages/vi.json")).default,
  };
  return {
    useLocale: () => intl.locale,
    useTranslations: (ns: "common") => (key: "justNow") => messages[intl.locale as keyof typeof messages][ns][key],
  };
});

import { useCompactTime } from "./use-compact-time";

const NOW = Date.parse("2026-10-06T12:00:00Z");
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

afterEach(() => {
  vi.useRealTimers();
});

describe("compactTime", () => {
  it("counts minutes, hours and days in the short unit form", () => {
    expect(compactTime(ago(30 * 60), "ko", "방금", NOW)).toBe("30분");
    expect(compactTime(ago(2 * 3600), "ko", "방금", NOW)).toBe("2시간");
    expect(compactTime(ago(3 * 86_400), "ko", "방금", NOW)).toBe("3일");
    expect(compactTime(ago(30 * 60), "en", "now", NOW)).toBe("30m");
    expect(compactTime(ago(2 * 3600), "en", "now", NOW)).toBe("2h");
    expect(compactTime(ago(30 * 60), "ja", "たった今", NOW)).toBe("30分");
    expect(compactTime(ago(2 * 3600), "ja", "たった今", NOW)).toBe("2時間");
  });

  it("rounds down so 59 minutes is still minutes and anything under a minute is the just-now word", () => {
    expect(compactTime(ago(59 * 60 + 59), "ko", "방금", NOW)).toBe("59분");
    expect(compactTime(ago(10), "ko", "방금", NOW)).toBe("방금");
    expect(compactTime(new Date(NOW + 5000).toISOString(), "en", "now", NOW)).toBe("now");
  });

  it("shows days rather than yesterday or last week, then the date from the seventh day", () => {
    expect(compactTime(ago(26 * 3600), "ko", "방금", NOW)).toBe("1일");
    expect(compactTime(ago(2 * 86_400 + 60), "ko", "방금", NOW)).toBe("2일");
    expect(compactTime(ago(6 * 86_400), "ko", "방금", NOW)).toBe("6일");
    expect(compactTime(ago(7 * 86_400), "ko", "방금", NOW)).toBe("9월 29일");
  });

  it("falls back to a date after a week, with the year only when it differs", () => {
    expect(compactTime("2026-09-20T12:00:00Z", "ko", "방금", NOW)).toBe("9월 20일");
    expect(compactTime("2025-09-20T12:00:00Z", "ko", "방금", NOW)).toBe("2025년 9월 20일");
  });
});

describe("useCompactTime", () => {
  it("says just now as a past moment from the catalog in every locale, not Intl's present tense", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    const said = (["ko", "en", "ja", "hi", "vi"] as const).map((locale) => {
      intl.locale = locale;
      return useCompactTime()(ago(10));
    });
    expect(said).toEqual(["방금", "now", "たった今", "अभी", "vừa xong"]);
    intl.locale = "ko";
    expect(useCompactTime()(ago(3 * 60))).toBe("3분");
  });
});
