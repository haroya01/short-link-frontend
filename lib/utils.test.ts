import { describe, expect, it } from "vitest";
import {
  countryFlag,
  countryName,
  formatDate,
  formatNumber,
  formatPercent,
  truncateMiddle,
} from "./utils";

describe("formatDate", () => {
  it("returns YYYY.MM.DD with two-digit padding", () => {
    // Use UTC midnight so the test is stable across timezones (browser locale would shift the
    // day on the west coast otherwise — only matters when the ISO falls within ±12h of UTC).
    expect(formatDate("2026-01-05T00:00:00Z")).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
  });

  it("pads single-digit month and day", () => {
    const out = formatDate("2026-03-09T12:00:00+09:00");
    // Browser interpretation may shift the day by tz, so just assert format + 2-digit width.
    expect(out).toMatch(/^2026\.\d{2}\.\d{2}$/);
  });
});

describe("formatNumber", () => {
  it("applies Korean thousand separators", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber(0)).toBe("0");
  });

  it("handles negative numbers", () => {
    expect(formatNumber(-1500)).toBe("-1,500");
  });
});

describe("formatPercent", () => {
  it("renders positive ratios with a leading +", () => {
    expect(formatPercent(0.123)).toBe("+12.3%");
    expect(formatPercent(0.5)).toBe("+50.0%");
  });

  it("does not add + for zero or negative", () => {
    expect(formatPercent(0)).toBe("0.0%");
    expect(formatPercent(-0.045)).toBe("-4.5%");
  });

  it("honors fractionDigits override", () => {
    expect(formatPercent(0.123456, 3)).toBe("+12.346%");
    expect(formatPercent(0.5, 0)).toBe("+50%");
  });
});

describe("truncateMiddle", () => {
  it("returns the input unchanged when under the cap", () => {
    expect(truncateMiddle("abc", 10)).toBe("abc");
    expect(truncateMiddle("a".repeat(10), 10)).toBe("a".repeat(10));
  });

  it("inserts an ellipsis in the middle when over the cap", () => {
    const out = truncateMiddle("abcdefghijklmnop", 9);
    expect(out).toContain("…");
    expect(out.length).toBe(9);
  });

  it("preserves head + tail symmetry on even caps", () => {
    const out = truncateMiddle("0123456789", 5);
    // (max - 1) = 4 → head = 2, tail = 2 (Math.ceil + Math.floor)
    expect(out).toBe("01…89");
  });
});

describe("countryName", () => {
  it("maps known ISO codes to Korean names", () => {
    expect(countryName("KR")).toBe("대한민국");
    expect(countryName("US")).toBe("미국");
    expect(countryName("JP")).toBe("일본");
  });

  it("uses Intl region data beyond the old hand-written map", () => {
    expect(countryName("MX")).toBe("멕시코");
    expect(countryName("KR", "en")).toBe("South Korea");
  });

  it("falls back to the input code when unknown — keeps display predictable", () => {
    expect(countryName("ZZ")).toBe("ZZ");
  });
});

describe("countryFlag", () => {
  it("renders ISO codes as regional indicator emoji pairs", () => {
    // KR (75/82) → 🇰🇷 — codepoint pair `1F1F0` + `1F1F7`.
    expect(countryFlag("KR")).toBe("\u{1F1F0}\u{1F1F7}");
    expect(countryFlag("US")).toBe("\u{1F1FA}\u{1F1F8}");
  });

  it("uppercases lowercase input", () => {
    expect(countryFlag("kr")).toBe(countryFlag("KR"));
  });

  it("returns the white flag for non-2-letter codes", () => {
    expect(countryFlag("")).toBe("🏳️");
    expect(countryFlag("USA")).toBe("🏳️");
    expect(countryFlag("K")).toBe("🏳️");
  });
});
