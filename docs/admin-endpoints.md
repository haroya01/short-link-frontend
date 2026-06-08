# 블로그 admin — 백엔드 엔드포인트 명세 (4건)

이 문서는 `feat(blog) 관리자 모더레이션 + 신고 enrich/takedown + 전역 지표` (PR #667) 에서 프론트가 **계약대로 호출하도록 준비된** 백엔드 엔드포인트 4건을 정의한다. 현재 프론트는 이 엔드포인트들이 없을 때 `NEXT_PUBLIC_USE_MOCKS=1` 의 목 또는 graceful fallback 으로 렌더된다. 백엔드가 아래 계약대로 구현되면 실데이터로 동작한다.

표기: `[public]` 인증 불필요 · `[admin]` **role=ADMIN JWT 필요** · `[auth]` 액세스 토큰 필요.

---

## 인증·권한 모델 (중요)

`[admin]` 엔드포인트는 **role 이 `ADMIN` 인 유효한 액세스 토큰**을 요구한다. 그 외 모든 경우 — 토큰 없음 / 만료·위조 토큰 / 유효하지만 비-admin 토큰 — 는 **`404 Not Found`** 로 응답한다.

- `401`/`403` 을 쓰지 않는 이유: admin 표면의 **존재 자체를 노출하지 않기 위함**. "인증 필요(401)" 나 "권한 없음(403)" 은 "여기에 admin 리소스가 있다" 는 신호가 된다. 비-admin 에게는 그냥 없는 경로처럼 보여야 한다.
- 프론트도 동일 정책: 비-admin/미로그인 이 `/blog/admin`, `/blog/admin/metrics`, `/admin`, `/admin/abuse-reports` 요청 시 로그인 redirect 나 "권한 없음" 화면 없이 **하드 404** (`notFound()`) 를 던진다. 단 이는 UX 가드일 뿐, **진짜 방어선은 백엔드의 404** 다 (FE 게이팅은 토큰을 직접 API 로 던지는 요청을 막지 못함).

> 응답 본문: 404 는 빈 본문 또는 표준 에러 envelope 어느 쪽이든 무방하나, 비-admin·없는-리소스 두 경우의 **응답이 구분되지 않아야** 한다(타이밍 포함 가능하면 일정하게).

---

## 1. 신고 목록 (enrich) — `[admin]`

`GET /api/v1/admin/abuse-reports?status={OPEN|REVIEWING|RESOLVED|REJECTED}`

기존 엔드포인트. 이번 변경은 **응답에 신고 대상 스냅샷(subject\*) 필드를 추가**하는 것. 프론트 모더레이션 큐가 `POST #123` 대신 글 제목·작가·링크로 보여주고 바로 이동할 수 있게 한다. 스냅샷 필드가 없으면 프론트는 `TYPE #id` 로 fallback 하므로 **하위호환**된다.

- `status` 생략 시 전체. 정렬: 최신 접수순(`createdAt desc`) 권장.
- 인증 실패/비-admin → `404`.

```ts
type AbuseSubjectType = "POST" | "USER" | "COMMENT";
type AbuseReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "REJECTED";

interface AbuseReportView {
  id: number;
  reporterUserId: number | null;   // 익명 신고는 null
  subjectType: AbuseSubjectType;
  subjectId: number;
  reason: string | null;
  status: AbuseReportStatus;
  adminNote: string | null;
  createdAt: string;               // ISO-8601
  resolvedAt: string | null;

  // ▼ 이번에 추가 (모두 optional — 미제공 시 FE 가 "TYPE #id" 로 표시)
  subjectTitle?: string | null;        // POST: 글 제목 · COMMENT: 댓글 본문 발췌 · USER: 표시명/핸들
  subjectAuthorHandle?: string | null; // 대상의 작성자 핸들(@ 제외). USER 면 본인 핸들
  subjectUrl?: string | null;          // 대상의 공개 canonical URL (글/작가/댓글 앵커). 없으면 null
  subjectRemoved?: boolean;            // POST 가 이미 비공개(unpublish)면 true
}
```

응답: `AbuseReportView[]`

**백엔드 책임**: `subjectType`/`subjectId` 로 대상을 조인해 스냅샷을 채운다. 대상이 이미 삭제됐으면 `subjectTitle` 은 null/플레이스홀더, `subjectUrl` 은 null, `subjectRemoved` 는 unpublish 여부로 채운다.

FE 소비처: `components/admin/abuse-reports-manager.tsx` (`listAbuseReports`).

---

## 2. 신고된 글 비공개 (takedown) — `[admin]`

`POST /api/v1/admin/posts/{postId}/unpublish`

신고된 **글을 공개 피드에서 내린다**. 삭제가 아니라 모더레이션 hide — 작성자의 초안/소유권은 유지하고 공개 상태만 `UNPUBLISHED` 로 바꾼다. 신고 자체의 status 와는 독립(신고 처리는 #1-resolve, 아래 참고).

- 요청 본문: 없음. (선택) `{ "reason"?: string }` 로 감사 로그용 사유를 받을 수 있음 — 프론트는 현재 보내지 않음.
- 멱등: 이미 UNPUBLISHED 면 `200`/`204` 로 그대로 성공 처리.
- 인증 실패/비-admin → `404`. 존재하지 않는 postId → `404` (동일 응답).
- 성공: `204 No Content` 또는 갱신된 글 요약. 프론트는 본문을 읽지 않음.

```
POST /api/v1/admin/posts/4821/unpublish
→ 204 No Content
```

**부수효과**: 해당 글이 공개 피드/검색/작가 페이지에서 제외돼야 함. 작성자에게 노출 정책(알림 등)은 백엔드 정책 트랙.

FE 소비처: `lib/api/abuse-reports.ts` (`unpublishReportedPost`) → 매니저의 "비공개" 액션. 성공 시 같은 글을 가리키는 모든 신고 행에 "비공개됨" 배지 반영.

> 참고(기존, 변경 없음): 신고 상태 전이는 `POST /api/v1/admin/abuse-reports/{id}/resolve` `{ resolution: "REVIEWING"|"RESOLVED"|"REJECTED", adminNote?: string }` → `AbuseReportView`. takedown 과 resolve 는 별개 액션이다(글을 내리되 신고는 REVIEWING 으로 둘 수 있음).

---

## 3. 신고 접수 — `COMMENT` 대상 수용 — `[public]`

`POST /api/v1/public/abuse-reports`

기존 엔드포인트. 이번 변경은 **`subjectType` 에 `COMMENT` 를 추가 수용**하는 것. 익명/로그인 사용자 모두 댓글을 신고할 수 있어야 한다.

```ts
// 요청 본문
{
  subjectType: "POST" | "USER" | "COMMENT";  // ← COMMENT 신규
  subjectId: number;                          // COMMENT 면 comment id
  reason?: string;                            // 최대 2000자
}
```

- 응답: `204`/`200` (프론트는 본문 미사용, 실패해도 사용자에겐 "접수됨" 으로 표시).
- `subjectType=COMMENT` 일 때 `subjectId` 는 존재하는 댓글 id 여야 함(검증). 미존재면 조용히 접수 처리하거나 `404` — FE 동작엔 영향 없음.
- CAPTCHA/PoW/레이트리밋 게이트는 기존 별도 트랙 그대로.

**백엔드 책임**: `COMMENT` 신고가 #1 목록에 `subjectType:"COMMENT"` 로 나타나고, 스냅샷(`subjectTitle`=댓글 발췌, `subjectUrl`=댓글 앵커, `subjectAuthorHandle`=댓글 작성자)을 채운다.

FE 소비처: `modules/blog/components/report-button.tsx` (`submitAbuseReport`) — 댓글 행(`comments.tsx`)에 노출(내가 못 지우는 남의 댓글 한정).

---

## 4. 블로그 전역 지표 — `[admin]`

`GET /api/v1/admin/blog/metrics`

작가 **전체를 합산한** 블로그 운영 지표. 인프라/리다이렉트 perf(기존 `kurl.me/admin`)·작가 개인 분석(`/blog/analytics`)과 구분되는 cross-author 롤업.

- 파라미터 없음(향후 `?window=30d` 등 확장 여지). 인증 실패/비-admin → `404`.

```ts
interface BlogTopPost {
  id: number;
  title: string;
  authorHandle: string;   // @ 제외
  reads: number;          // 누적 조회수
  url: string | null;     // 공개 canonical URL (없으면 null)
}

interface BlogAdminMetrics {
  totalPosts: number;     // 전체 발행 글 수(작가 합산, lifetime)
  totalReads: number;     // 전체 조회수(작가 합산, lifetime)
  activeAuthors: number;  // 최근 30일 발행 또는 조회된 작가 수
  openReports: number;    // 미처리 신고 수(OPEN + REVIEWING) — #1 backlog 와 일치
  topPosts: BlogTopPost[]; // 조회수 내림차순. 권장 상위 5~10개
}
```

응답: `BlogAdminMetrics`

**백엔드 책임**: 집계는 캐시/사전계산 권장(실시간 full-scan 회피). `openReports` 는 #1 의 OPEN+REVIEWING 카운트와 동일 소스.

FE 소비처: `modules/blog/api/admin.ts` (`getBlogAdminMetrics`) → `app/[locale]/blog/admin/metrics/page.tsx`. 미구현 시 프론트는 목 데이터로 렌더.

---

## 구현 체크리스트

- [ ] **공통**: `[admin]` 4·1·2 + 비-admin 은 `401/403` 아닌 **`404`** (존재 비노출)
- [ ] #1 `GET /api/v1/admin/abuse-reports` 응답에 `subjectTitle/subjectAuthorHandle/subjectUrl/subjectRemoved` 추가
- [ ] #2 `POST /api/v1/admin/posts/{postId}/unpublish` 신설(멱등, 공개 표면에서 제외)
- [ ] #3 `POST /api/v1/public/abuse-reports` 의 `subjectType` 에 `COMMENT` 수용 + #1 스냅샷 처리
- [ ] #4 `GET /api/v1/admin/blog/metrics` 신설(`BlogAdminMetrics`)
