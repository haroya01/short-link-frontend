import type { WeeklyInsights } from "@/types";

import { request, requestBlob } from "./client";

export async function getWeeklyInsights(): Promise<WeeklyInsights> {
  return request<WeeklyInsights>("/api/v1/users/me/insights/week", { method: "GET" });
}

export async function deleteMyAccount(): Promise<void> {
  await request("/api/v1/users/me", { method: "DELETE" });
}

export async function downloadMyData(): Promise<void> {
  const { blob, filename } = await requestBlob("/api/v1/users/me/export", {
    method: "GET",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? "kurl-data.json";
  a.click();
  URL.revokeObjectURL(url);
}
