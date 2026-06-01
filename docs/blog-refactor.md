# blog.kurl 리팩토링 계획 / 진행 / 보고서

블로그·프로필(`/p/[username]`, `/blog/*`) 표면의 재사용성·확장성을 끌어올리는 리팩토링 작업 기록. 이 문서가 ground truth — 계획, 진행 상태, 그리고 작업 중 발견한 동작/UX 피드백을 한 곳에 모은다.

## 대전제 (깨면 안 되는 규칙)

1. **UI/UX 픽셀 불변.** 마크업·클래스·렌더 결과가 바뀌면 안 된다. 모든 리팩토링은 내부 구조 변경(로직 추출/통합)이고, 사용자에게 보이는 결과는 동일해야 한다.
2. **변경 전 테스트.** 추출하는 로직은 vitest 특성화(characterization) 테스트로 현재 동작을 먼저 고정한다. 건드리는 UI 표면은 Playwright 시각 스냅샷(`visual-fixtures`)으로 픽셀을 먼저 잠근 뒤 손댄다.
3. **repo 테스트 철학 존중.** `vitest.config.ts`에 명시된 대로 React 컴포넌트 렌더링은 단위테스트하지 않는다(@testing-library/react 미설치). 로직은 vitest, 시각은 Playwright. 리팩토링은 이 분담선을 강화하는 방향 — "컴포넌트에서 순수 로직을 빼내 vitest로 덮는다".
4. **임의 수정 금지.** 동작·UX가 어색하거나 버그로 보여도 손대지 않는다. 아래 "관찰 메모"에 적고 넘어간다.
5. **디자인 시스템 준수.** `AGENTS.md` §1~§10(카드 토큰, 4 아키타입, 1 primary CTA, 공유 primitive, §10 weblog `max-w-2xl`)을 그대로 따른다.

## 현황 (리팩토링 출발점)

- 대상 범위: `modules/blog`(87파일), `modules/profile`(53파일), `app/[locale]/blog/*`(23), `app/[locale]/p/*`(18) — 약 21,700 LOC.
- 테스트 현황: lib 순수함수 16개 파일만 커버. 컴포넌트·훅·라우트는 사실상 0%.
- 가장 큰 위험: 561 LOC `section.tsx`, 937 LOC `profile-feed-editor.tsx` 등 거대 컴포넌트 — 테스트 없음.

## 발견한 중복/스멜 (리팩토링 후보)

- **공유 Set 스토어 중복**: `use-bookmarks.ts` ≈ `use-series-subscriptions.ts` (모듈 레벨 Set + `useSyncExternalStore` + 낙관적 add/remove + 로그아웃 리셋, ~90% 동일).
- **낙관적 토글 버튼 중복**: `like-button` / `bookmark-button` / `follow-button` / `series-subscribe-button` — `useState`+`useEffect`로드+낙관적 토글+롤백 패턴 4벌.
- **아바타 인라인 렌더 중복**: `feed-card`, `author-rail`, `discovery-rail`, `mobile-discovery-strip` 등에서 "이미지 있으면 img, 없으면 이니셜 원" 반복.
- **블록 다이얼로그 보일러플레이트**: 10개 다이얼로그가 `open 시 parse → canSave → JSON.stringify 후 onSubmit` 동형 패턴.
- **provider resolver 중복**: `booking-providers.ts` ≈ `embed-providers.ts` — URL 파싱→host 매칭→spec 반환 동일 로직.
- **라우트 가드/페치 중복**: 클라이언트 워크스페이스 페이지 15+곳에서 `const { ready, authenticated } = useAuth()` 가드 반복, write/posts/drafts/curation에서 `listMyPosts()` 페치+필터 반복.
- **타입 분기 렌더**: `profile-feed-editor`의 중첩 if(DIVIDER/IMAGE/TEXT/common), `post-blocks`의 블록 렌더 — 레지스트리(맵)로 열어두면 확장에 유리.
- **API 경계 약함**: `modules/profile` 컴포넌트들이 `modules/profile/api` 대신 `@/lib/api`를 직접 import.

## PR 계획 (적당히 묶음, 너무 잘게 안 자름)

각 PR은 "테스트 먼저 → 추출/통합 → 빌드·타입체크·테스트 green → PR". 머지는 매번 별도 허락.

### PR A — blog 공유 클라이언트 상태/토글/아바타 원시화
- `createSharedSetStore<T>()` 팩토리(순수 코어 + `useSyncExternalStore` 래퍼). `use-bookmarks`·`use-series-subscriptions`를 이 위에 재구성.
- `optimistic-toggle` 순수 리듀서 + `useOptimisticToggle()` 훅. 4개 액션 버튼 내부를 교체(마크업 동일).
- `<Avatar>` 컴포넌트로 아바타 인라인 렌더 통합.
- 테스트: `shared-set-store.test.ts`, `optimistic-toggle.test.ts`(순수 코어), 아바타·버튼 시각 픽스처 스냅샷.

### PR B — profile 블록 다이얼로그 폼 하네스 + provider resolver 팩토리 + 렌더 레지스트리
- `createProviderResolver(specs)`로 booking/embed resolver 통합(기존 테스트 green 유지).
- `useBlockDialogForm<T>()` + `BaseBlockDialog`로 다이얼로그 보일러플레이트 제거(단순 다이얼로그부터).
- `profile-feed-editor` 행 렌더 → 레지스트리 맵으로 분기 정리.
- 테스트: resolver 팩토리/폼 하네스 순수 로직 vitest + 대표 다이얼로그 시각 픽스처.

### PR C — route 공유 훅 + 메타데이터 빌더 + API 경계 강화
- `useAuthGuard()`로 클라이언트 페이지 가드 통합.
- `useMyPosts()` + 순수 `filterPosts()` 코어로 write/posts/drafts/curation 페치+필터 통합.
- 공개 페이지 SEO 메타데이터 빌더 헬퍼.
- `modules/profile` 컴포넌트의 `@/lib/api` 직접 import를 `modules/profile/api` 경유로 정리.
- 테스트: `filterPosts`·메타데이터 빌더 vitest + 기존 e2e(auth-redirect, blog-write-flow) green.

### 범위 밖(이번에 안 함) — 거대 컴포넌트 분해
`section.tsx`(561)·`profile-feed-editor.tsx`(937)·`comments.tsx`·`series-reading-shell.tsx` 내부 분해는 시각 회귀 위험이 가장 크고 재사용 이득은 위 통합보다 작다. PR A~C에서 만든 훅/레지스트리가 분해의 발판이 되므로, 이번 범위에서는 제외하고 후속 작업으로 남긴다.

## 진행 상태

- [ ] 계획 문서 (이 문서)
- [ ] PR A
- [ ] PR B
- [ ] PR C

## 관찰 메모 (동작/UX — 임의 수정 안 함, 보고만)

작업 중 눈에 띈 동작·UX 이슈를 여기에 누적한다. 코드로 고치지 않는다.

_(아직 없음 — 작업 진행하며 채움)_
