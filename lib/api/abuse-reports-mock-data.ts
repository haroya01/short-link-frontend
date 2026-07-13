import type { AbuseReportView } from "./abuse-reports";

/**
 * Demo/mock moderation queue — a spread of subjects, reasons, and statuses so the screen is usable
 * without a backend: an open POST report (unpublish-able), a COMMENT report shown with its excerpt, a
 * USER report (bare-id fallback + bio excerpt) that can be suspended/banned, and an already-removed
 * post showing the "removed" badge. Each carries a structured `reasonCode` + optional `detail` per the
 * #611 contract. Lives in a mock-data file so its Korean demo copy is exempt from the i18n literal
 * guard (i18n-literals.test).
 */
export const MOCK_REPORTS: AbuseReportView[] = [
  {
    id: 5001,
    reporterUserId: 8123,
    subjectType: "POST",
    subjectId: 101,
    reasonCode: "SPAM",
    detail: "같은 홍보 글을 여러 번 도배하고 있어요.",
    status: "OPEN",
    adminNote: null,
    createdAt: "2026-07-03T02:14:00.000Z",
    resolvedAt: null,
    subjectTitle: "지금 바로 무료 상품권 받는 법 (선착순)",
    subjectAuthorHandle: "promo_kim",
    subjectUrl: "http://localhost:3001/p/promo_kim/free-voucher",
    subjectExcerpt: "선착순 마감 임박! 아래 링크로 지금 신청하면 무료 상품권을 드립니다…",
    subjectRemoved: false,
  },
  {
    id: 5002,
    reporterUserId: null,
    subjectType: "COMMENT",
    subjectId: 4021,
    reasonCode: "HARASSMENT",
    detail: null,
    status: "OPEN",
    adminNote: null,
    createdAt: "2026-07-02T09:40:00.000Z",
    resolvedAt: null,
    subjectAuthorHandle: "gruff_reader",
    subjectExcerpt: "이런 글이나 쓰는 사람은 여기 있을 자격도 없다. 당장 그만둬라.",
    subjectRemoved: false,
  },
  {
    id: 5003,
    reporterUserId: 4410,
    subjectType: "USER",
    subjectId: 77,
    reasonCode: "OTHER",
    detail: "유명 작가를 사칭하는 계정으로 보입니다.",
    status: "REVIEWING",
    adminNote: "프로필 확인 중",
    createdAt: "2026-07-01T16:05:00.000Z",
    resolvedAt: null,
    subjectAuthorHandle: "sora_official",
    subjectExcerpt: "공식 계정입니다. 협업 문의는 DM 주세요.",
    subjectRemoved: false,
  },
  {
    id: 5004,
    reporterUserId: 2001,
    subjectType: "POST",
    subjectId: 104,
    reasonCode: "VIOLENCE",
    detail: "폭력을 조장하는 표현이 반복적으로 나옵니다.",
    status: "RESOLVED",
    adminNote: "확인 후 비공개 처리함",
    createdAt: "2026-06-29T11:22:00.000Z",
    resolvedAt: "2026-06-30T01:00:00.000Z",
    subjectTitle: "논란이 된 그 글",
    subjectAuthorHandle: "anon_writer",
    subjectUrl: "http://localhost:3001/p/anon_writer/controversial",
    subjectExcerpt: "그들에게 본때를 보여줘야 한다…",
    subjectRemoved: true,
  },
];
