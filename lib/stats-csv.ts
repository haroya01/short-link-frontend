import type { LinkStats } from "@/types";

/**
 * 통계 CSV 내보내기 — 데이터 소유권 캠페인(마크다운 개방)의 통계판.
 * long format(section,label,count) 한 장으로 일별/유입/국가/기기를 전부 담는다 —
 * 시트 분리 없이 스프레드시트에서 피벗 한 번으로 원하는 축을 뽑는 구조.
 * UTF-8 BOM 은 엑셀이 한글 라벨을 깨뜨리지 않게 하는 실무 관행.
 */
export function buildStatsCsv(data: LinkStats): string {
  const rows: string[][] = [["section", "label", "count"]];
  for (const d of data.dailyClicks ?? []) rows.push(["daily", d.date, String(d.count)]);
  for (const r of data.referrerHostClicks ?? []) rows.push(["referrer", r.host, String(r.count)]);
  for (const c of data.countryClicks ?? []) rows.push(["country", c.country, String(c.count)]);
  for (const v of data.deviceClicks ?? []) rows.push(["device", v.device, String(v.count)]);
  return "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function statsCsvFilename(shortCode: string): string {
  return `kurl-stats-${shortCode}.csv`;
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
