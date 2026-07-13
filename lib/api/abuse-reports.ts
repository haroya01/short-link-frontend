import { request } from "./client";
import { MOCK_REPORTS } from "./abuse-reports-mock-data";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

export type AbuseSubjectType = "POST" | "USER" | "COMMENT";

export type AbuseReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "REJECTED";

export type AbuseResolution = "REVIEWING" | "RESOLVED" | "REJECTED";

/**
 * Structured report reason (backend #611). Replaces the old free-text `reason`: the reporter picks
 * one of six codes and may add free-text `detail`. The six mirror the iOS app's reason set so a
 * moderator reads the same category regardless of where the report came from.
 */
export type AbuseReasonCode =
  | "SPAM"
  | "HARASSMENT"
  | "VIOLENCE"
  | "SEXUAL"
  | "COPYRIGHT"
  | "OTHER";

/**
 * Enforcement action a moderator attaches when resolving a report. A report can also be resolved with
 * no action (reviewed, no violation), in which case `action` is omitted.
 */
export type AbuseAction =
  | "UNPUBLISH_POST"
  | "DELETE_COMMENT"
  | "SUSPEND_USER"
  | "BAN_USER";

export interface AbuseReportView {
  id: number;
  reporterUserId: number | null;
  subjectType: AbuseSubjectType;
  subjectId: number;
  /** Structured reason picked by the reporter (backend #611). */
  reasonCode: AbuseReasonCode | null;
  /** Reporter's free-text elaboration (was the whole `reason` before #611). */
  detail: string | null;
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
  /**
   * A short snapshot of the reported content itself — the comment body, or the first line of the post /
   * the author's bio — so a moderator can judge COMMENT and USER reports (which have no title/URL) in
   * the queue without opening each one. Optional; absent on older payloads.
   */
  subjectExcerpt?: string | null;
  /** True once the reported subject has been removed (post unpublished / comment deleted). */
  subjectRemoved?: boolean;
}

/**
 * Public — 익명/로그인 user 모두 가능. CAPTCHA / PoW 게이트는 백엔드 별도 트랙.
 * `reasonCode` 필수(enum), `detail` 은 선택 자유서술.
 */
export async function submitAbuseReport(payload: {
  subjectType: AbuseSubjectType;
  subjectId: number;
  reasonCode: AbuseReasonCode;
  detail?: string;
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

/**
 * Admin only. Resolves a report and, optionally, applies an enforcement `action` in the same call
 * (backend #611): `UNPUBLISH_POST`, `DELETE_COMMENT`, `SUSPEND_USER` (needs `suspendUntil`) or
 * `BAN_USER`. Omitting `action` records the status change alone — "reviewed, no violation".
 */
export async function resolveAbuseReport(
  id: number,
  payload: {
    resolution: AbuseResolution;
    action?: AbuseAction;
    /** ISO-8601 — required by the backend when action is SUSPEND_USER (SUSPEND_REQUIRES_EXPIRY). */
    suspendUntil?: string;
    adminNote?: string;
  },
): Promise<AbuseReportView> {
  if (USE_MOCKS) {
    const base = MOCK_REPORTS.find((r) => r.id === id);
    const now = new Date().toISOString();
    // Mirror the backend: an UNPUBLISH_POST / DELETE_COMMENT action removes the subject.
    const removes = payload.action === "UNPUBLISH_POST" || payload.action === "DELETE_COMMENT";
    return Promise.resolve({
      id,
      reporterUserId: base?.reporterUserId ?? null,
      subjectType: base?.subjectType ?? "POST",
      subjectId: base?.subjectId ?? id,
      reasonCode: base?.reasonCode ?? null,
      detail: base?.detail ?? null,
      status: payload.resolution,
      adminNote: payload.adminNote ?? base?.adminNote ?? null,
      createdAt: base?.createdAt ?? now,
      resolvedAt: payload.resolution === "REVIEWING" ? null : now,
      subjectTitle: base?.subjectTitle,
      subjectAuthorHandle: base?.subjectAuthorHandle,
      subjectUrl: base?.subjectUrl,
      subjectExcerpt: base?.subjectExcerpt,
      subjectRemoved: removes || base?.subjectRemoved,
    });
  }
  return request<AbuseReportView>(`/api/v1/admin/abuse-reports/${id}/resolve`, {
    method: "POST",
    body: payload,
  });
}
