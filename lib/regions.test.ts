import { describe, expect, it } from "vitest";
import { REGION_CODES, mergeRegionClicks, regionCodeOf } from "./regions";

describe("regionCodeOf", () => {
  it("trusts the code the backend sends", () => {
    expect(regionCodeOf("Tokyo", "JP-13")).toBe("JP-13");
    expect(regionCodeOf("Seoul", "kr-11")).toBe("KR-11");
    expect(regionCodeOf(null, "JP-27")).toBe("JP-27");
  });

  it("moves Gangwon and Jeonbuk from their old codes to the current ones", () => {
    expect(regionCodeOf("Gangwon-do", "KR-42")).toBe("KR-51");
    expect(regionCodeOf("North Jeolla", "KR-45")).toBe("KR-52");
  });

  it("does not second-guess a code outside Japan and Korea by its name", () => {
    expect(regionCodeOf("Tokyo", "US-CA")).toBeNull();
    expect(regionCodeOf("California", "US-CA")).toBeNull();
  });

  it("falls back to the English name when an older response has no code", () => {
    expect(regionCodeOf("Tokyo")).toBe("JP-13");
    expect(regionCodeOf("Tokyo", null)).toBe("JP-13");
    expect(regionCodeOf("Seoul", undefined)).toBe("KR-11");
    expect(regionCodeOf("Gyeonggi")).toBe("KR-41");
  });

  it("reads the spellings GeoIP sources use for the same place", () => {
    expect(regionCodeOf("Hyōgo")).toBe("JP-28");
    expect(regionCodeOf("Ōsaka")).toBe("JP-27");
    expect(regionCodeOf("Tokyo Metropolis")).toBe("JP-13");
    expect(regionCodeOf("Osaka-fu")).toBe("JP-27");
    expect(regionCodeOf("Kanagawa Prefecture")).toBe("JP-14");
    expect(regionCodeOf("Gyeonggi-do")).toBe("KR-41");
    expect(regionCodeOf("Sejong-si")).toBe("KR-50");
    expect(regionCodeOf("Chungcheongbuk-do")).toBe("KR-43");
    expect(regionCodeOf("North Chungcheong")).toBe("KR-43");
    expect(regionCodeOf("Jeju Special Self-Governing Province")).toBe("KR-49");
    expect(regionCodeOf("Gangwon State")).toBe("KR-51");
    expect(regionCodeOf("Busan Metropolitan City")).toBe("KR-26");
  });

  it("returns null for a name it does not know", () => {
    expect(regionCodeOf("California")).toBeNull();
    expect(regionCodeOf("Île-de-France")).toBeNull();
    expect(regionCodeOf("")).toBeNull();
    expect(regionCodeOf(null)).toBeNull();
  });

  it("knows all 47 prefectures and 17 provinces", () => {
    expect(REGION_CODES.filter((c) => c.startsWith("JP-"))).toHaveLength(47);
    expect(REGION_CODES.filter((c) => c.startsWith("KR-"))).toHaveLength(17);
  });
});

describe("mergeRegionClicks", () => {
  it("adds an old English-only row to the coded row for the same place", () => {
    const merged = mergeRegionClicks([
      { region: "Tokyo", regionCode: "JP-13", count: 5 },
      { region: "Tōkyō", count: 2 },
      { region: "California", regionCode: "US-CA", count: 3 },
      { region: "Berlin", count: 1 },
    ]);
    expect(merged).toEqual([
      { region: "Tokyo", code: "JP-13", count: 7 },
      { region: "California", code: null, count: 3 },
      { region: "Berlin", code: null, count: 1 },
    ]);
  });
});
