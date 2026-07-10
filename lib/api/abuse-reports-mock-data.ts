import type { AbuseReportView } from "./abuse-reports";

/**
 * Demo/mock moderation queue — a small spread of subjects and statuses so the screen is usable
 * without a backend: an open post report (takedown-able), one under review, a non-post subject that
 * renders the bare-id fallback, and an already-removed post showing the "removed" badge. Lives in a
 * mock-data file so its Korean demo copy is exempt from the i18n literal guard (i18n-literals.test).
 */
export const MOCK_REPORTS: AbuseReportView[] = [
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
