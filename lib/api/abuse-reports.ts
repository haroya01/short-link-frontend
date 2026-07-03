import { request } from "./client";

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

// Demo/mock queue — a small spread of subjects and statuses so the moderation screen is usable
// without a backend: an open post report (takedown-able), one under review, a non-post subject that
// renders the bare-id fallback, and an already-removed post showing the "removed" badge.
const MOCK_REPORTS: AbuseReportView[] = [
  {
    id: 5001,
    reporterUserId: 8123,
    subjectType: "POST",
    subjectId: 101,
    reason: "스팸/도배성 홍보 글입니다.",
    status: "OPEN",
    adminNote: null,
    createdAt: "2026-07-03T02:14:00.000Z",
    resolvedAt: null,
    subjectTitle: "지금 바로 무료 상품권 받는 법 (선착순)",
    subjectAuthorHandle: "promo_kim",
    subjectUrl: "http://localhost:3001/p/promo_kim/free-voucher",
    subjectRemoved: false,
  },
  {
    id: 5002,
    reporterUserId: null,
    subjectType: "POST",
    subjectId: 102,
    reason: "타인 저작물을 무단으로 도용했습니다.",
    status: "REVIEWING",
    adminNote: "원저작자 확인 중",
    createdAt: "2026-07-02T09:40:00.000Z",
    resolvedAt: null,
    subjectTitle: "디자인 시스템 다크모드 마이그레이션",
    subjectAuthorHandle: "sora",
    subjectUrl: "http://localhost:3001/p/sora/design-system-dark",
    subjectRemoved: false,
  },
  {
    id: 5003,
    reporterUserId: 4410,
    subjectType: "USER",
    subjectId: 77,
    reason: "다른 사용자를 사칭하는 계정으로 보입니다.",
    status: "OPEN",
    adminNote: null,
    createdAt: "2026-07-01T16:05:00.000Z",
    resolvedAt: null,
  },
  {
    id: 5004,
    reporterUserId: 2001,
    subjectType: "POST",
    subjectId: 104,
    reason: "혐오 표현이 포함되어 있습니다.",
    status: "RESOLVED",
    adminNote: "확인 후 비공개 처리함",
    createdAt: "2026-06-29T11:22:00.000Z",
    resolvedAt: "2026-06-30T01:00:00.000Z",
    subjectTitle: "논란이 된 그 글",
    subjectAuthorHandle: "anon_writer",
    subjectUrl: "http://localhost:3001/p/anon_writer/controversial",
    subjectRemoved: true,
  },
];

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
