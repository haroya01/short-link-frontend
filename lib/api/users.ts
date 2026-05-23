import type { ProblemDetail, WeeklyInsights } from "@/types";

import { ApiError, readToken, request, withBase } from "./client";

export async function getWeeklyInsights(): Promise<WeeklyInsights> {
  return request<WeeklyInsights>("/api/v1/users/me/insights/week", { method: "GET" });
}

export async function deleteMyAccount(): Promise<void> {
  await request("/api/v1/users/me", { method: "DELETE" });
}

export async function downloadMyData(): Promise<void> {
  const token = readToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(withBase("/api/v1/users/me/export"), {
    method: "GET",
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let parsed: ProblemDetail;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { status: res.status, detail: text || res.statusText };
    }
    throw new ApiError(res.status, parsed);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kurl-data.json";
  a.click();
  URL.revokeObjectURL(url);
}
