import { request } from "./client";
import { MOCK_REPORTS } from "./abuse-reports-mock-data";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

export type AbuseSubjectType = "POST" | "USER" | "COMMENT";

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
  /**
   * Subject snapshot — populated by the backend so the moderation queue can show what was reported
   * (post title / author handle) and link straight to it, instead of a bare "POST #123". All fields
   * are optional: an older backend that doesn't embed them makes the UI fall back to the id form.
   */
  subjectTitle?: string | null;
  subjectAuthorHandle?: string | null;
  subjectUrl?: string | null;
  /** True once the reported POST has been unpublished via {@link unpublishReportedPost}. */
  subjectRemoved?: boolean;
}

/** Public — 익명/로그인 user 모두 가능. CAPTCHA / PoW 게이트는 백엔드 별도 트랙. */
export async function submitAbuseReport(payload: {
  subjectType: AbuseSubjectType;
  subjectId: number;
  reason?: string;
}): Promise<void> {
  // Demo/mock mode: accept the report so the submit flow resolves to its "접수됨" state instead of
  // hitting a backend that isn't there. The real endpoint stays the only path outside mock mode.
  if (USE_MOCKS) return Promise.resolve();
  await request("/api/v1/public/abuse-reports", { method: "POST", body: payload });
}

/** Admin only. */
export async function listAbuseReports(status?: AbuseReportStatus): Promise<AbuseReportView[]> {
  if (USE_MOCKS) {
    return Promise.resolve(
      status ? MOCK_REPORTS.filter((r) => r.status === status) : MOCK_REPORTS,
    );
  }
  const qs = status ? `?status=${status}` : "";
  return request<AbuseReportView[]>(`/api/v1/admin/abuse-reports${qs}`, { method: "GET" });
}

/** Admin only. */
export async function resolveAbuseReport(
  id: number,
  payload: { resolution: AbuseResolution; adminNote?: string },
): Promise<AbuseReportView> {
  if (USE_MOCKS) {
    const base = MOCK_REPORTS.find((r) => r.id === id);
    const now = new Date().toISOString();
    return Promise.resolve({
      id,
      reporterUserId: base?.reporterUserId ?? null,
      subjectType: base?.subjectType ?? "POST",
      subjectId: base?.subjectId ?? id,
      reason: base?.reason ?? null,
      status: payload.resolution,
      adminNote: payload.adminNote ?? base?.adminNote ?? null,
      createdAt: base?.createdAt ?? now,
      resolvedAt: payload.resolution === "REVIEWING" ? null : now,
      subjectTitle: base?.subjectTitle,
      subjectAuthorHandle: base?.subjectAuthorHandle,
      subjectUrl: base?.subjectUrl,
      subjectRemoved: base?.subjectRemoved,
    });
  }
  return request<AbuseReportView>(`/api/v1/admin/abuse-reports/${id}/resolve`, {
    method: "POST",
    body: payload,
  });
}

/**
 * Admin only — takedown. Unpublishes a reported POST so it leaves the public feed (the author keeps
 * the draft; this is a moderation hide, not a delete). Distinct from {@link resolveAbuseReport},
 * which only updates the report's status/note. Backend: `POST /api/v1/admin/posts/{postId}/unpublish`.
 */
export async function unpublishReportedPost(postId: number): Promise<void> {
  if (USE_MOCKS) return Promise.resolve();
  await request(`/api/v1/admin/posts/${postId}/unpublish`, { method: "POST" });
}
