import type { LinkStats } from "@/types";

import { request } from "./client";

export async function getStats(shortCode: string): Promise<LinkStats> {
  return request<LinkStats>(`/api/v1/links/${shortCode}/stats`, { method: "GET" });
}

export async function getPublicLinkStats(shortCode: string): Promise<LinkStats> {
  return request<LinkStats>(`/api/v1/links/${shortCode}/public-stats`, { method: "GET" });
}

export async function getPublicTotals(): Promise<{ links: number; clicks: number }> {
  return request("/api/v1/public/stats", { method: "GET" });
}
