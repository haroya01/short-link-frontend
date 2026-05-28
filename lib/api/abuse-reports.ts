import { request } from "./client";

export type AbuseSubjectType = "POST" | "USER";

export type AbuseReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "REJECTED";

export type AbuseResolution = "REVIEWING" | "RESOLVED" | "REJECTED";

export interface AbuseReportView {
  id: number;
  reporterUserId: number | null;
  subjectType: AbuseSubjectType;
  subjectId: number;
  reason: string | null;
  status: AbuseReportStatus;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

/** Public — 익명/로그인 user 모두 가능. CAPTCHA / PoW 게이트는 백엔드 별도 트랙. */
export async function submitAbuseReport(payload: {
  subjectType: AbuseSubjectType;
  subjectId: number;
  reason?: string;
}): Promise<void> {
  await request("/api/v1/public/abuse-reports", { method: "POST", body: payload });
}

/** Admin only. */
export async function listAbuseReports(status?: AbuseReportStatus): Promise<AbuseReportView[]> {
  const qs = status ? `?status=${status}` : "";
  return request<AbuseReportView[]>(`/api/v1/admin/abuse-reports${qs}`, { method: "GET" });
}

/** Admin only. */
export async function resolveAbuseReport(
  id: number,
  payload: { resolution: AbuseResolution; adminNote?: string },
): Promise<AbuseReportView> {
  return request<AbuseReportView>(`/api/v1/admin/abuse-reports/${id}/resolve`, {
    method: "POST",
    body: payload,
  });
}
