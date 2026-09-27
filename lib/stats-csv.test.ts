import { describe, expect, it } from "vitest";
import { buildStatsCsv, statsCsvFilename } from "./stats-csv";
import type { LinkStats } from "@/types";

const base = {
  dailyClicks: [{ date: "2026-07-22", count: 3 }],
  referrerHostClicks: [{ host: "x.com", count: 2 }],
  countryClicks: [{ country: "KR", count: 5 }],
  deviceClicks: [{ device: "mobile", count: 4 }],
} as unknown as LinkStats;

describe("buildStatsCsv", () => {
  it("BOM + 헤더 + 섹션별 long format 행", () => {
    const csv = buildStatsCsv(base);
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).split("\n");
    expect(lines[0]).toBe("section,label,count");
    expect(lines).toContain("daily,2026-07-22,3");
    expect(lines).toContain("referrer,x.com,2");
    expect(lines).toContain("country,KR,5");
    expect(lines).toContain("device,mobile,4");
  });

  it("쉼표/따옴표 라벨은 RFC4180 이스케이프", () => {
    const csv = buildStatsCsv({
      ...base,
      referrerHostClicks: [{ host: 'a,"b"', count: 1 }],
    } as unknown as LinkStats);
    expect(csv).toContain('referrer,"a,""b""",1');
  });

  it("누락 섹션은 건너뛴다 (부분 payload 안전)", () => {
    const csv = buildStatsCsv({ dailyClicks: [{ date: "2026-07-01", count: 1 }] } as unknown as LinkStats);
    expect(csv.slice(1).split("\n")).toHaveLength(2);
  });

  it("파일명은 shortCode 를 품는다", () => {
    expect(statsCsvFilename("abc123")).toBe("kurl-stats-abc123.csv");
  });
});
