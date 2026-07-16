import { describe, expect, it } from "vitest";
import {
  FREQUENT_COUNTRY_CODES,
  ISO_COUNTRY_CODES,
  countryOptions,
  matchesCountryQuery,
} from "./countries";

describe("ISO_COUNTRY_CODES", () => {
  it("covers the full ISO 3166-1 alpha-2 set (well beyond the old 17)", () => {
    expect(ISO_COUNTRY_CODES.length).toBeGreaterThan(240);
  });

  it("has unique, well-formed two-letter uppercase codes", () => {
    const seen = new Set<string>();
    for (const c of ISO_COUNTRY_CODES) {
      expect(c).toMatch(/^[A-Z]{2}$/);
      expect(seen.has(c)).toBe(false);
      seen.add(c);
    }
  });

  it("includes every previously-hardcoded frequent country", () => {
    for (const c of FREQUENT_COUNTRY_CODES) expect(ISO_COUNTRY_CODES).toContain(c);
  });
});

describe("countryOptions", () => {
  it("localizes names via Intl.DisplayNames (not hardcoded) and derives flags", () => {
    const ko = countryOptions("ko");
    const kr = ko.find((o) => o.code === "KR");
    expect(kr?.name).toBe("대한민국");
    expect(kr?.flag).toBe("\u{1F1F0}\u{1F1F7}"); // 🇰🇷 codepoint pair

    const en = countryOptions("en");
    expect(en.find((o) => o.code === "KR")?.name).toBe("South Korea");
    expect(en.find((o) => o.code === "JP")?.name).toBe("Japan");
  });

  it("returns one option per ISO code, sorted by localized name", () => {
    const opts = countryOptions("en");
    expect(opts.length).toBe(ISO_COUNTRY_CODES.length);
    const names = opts.map((o) => o.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "en"));
    expect(names).toEqual(sorted);
  });
});

describe("matchesCountryQuery", () => {
  const kr = { code: "KR", name: "South Korea", flag: "🇰🇷" };
  it("matches by code or localized name, case-insensitively", () => {
    expect(matchesCountryQuery(kr, "kr")).toBe(true);
    expect(matchesCountryQuery(kr, "KR")).toBe(true);
    expect(matchesCountryQuery(kr, "korea")).toBe(true);
    expect(matchesCountryQuery(kr, "Kore")).toBe(true);
    expect(matchesCountryQuery(kr, "japan")).toBe(false);
  });
  it("an empty query matches everything", () => {
    expect(matchesCountryQuery(kr, "")).toBe(true);
    expect(matchesCountryQuery(kr, "   ")).toBe(true);
  });
});
