# 발견 피드 리뉴얼 — 카드 그리드 (Phase 1 적용 + 후속 플랜)

크리에이터/블로그 무게중심 로드맵의 "발견(Discovery)" 작업. 블로그 홈의 **둘러보기(browse) 면**을
리스트 → **메이슨리 카드 그리드**로 바꾼다. 읽기(reading) 면(글·작가·태그)은 컬럼 유지.

## ⚠️ 결정: AGENTS.md §10.1 (reading-column 불변식)의 예외
`ReadingShell` / AGENTS.md §10.1 은 "피드 본문은 모든 면에서 `max-w-2xl` 단일 컬럼"을 불변식으로 둔다
(`FeedList` 주석도 *"a quiet weblog reads as a vertical list, NOT a multi-column card grid"*).
이번 변경은 **발견 면(블로그 홈 최신/검색)에 한해 그 불변식을 예외**로 둔다 — browse 면은 그리드가 맞고,
read 면은 컬럼이 맞다는 판단. **AGENTS.md §10.1 에 이 예외를 명문화 완료** (§10.1 하단 예외 콜아웃).

## Phase 1 — 적용 완료 (이 브랜치, FE only, 백엔드 0)
- 신규 `modules/blog/components/discovery-card.tsx`
  - `DiscoveryCard(item, locale, featured?)` — `PublicFeedItem` 1개를 타일로. ogImageUrl 있으면 **사진 커버**,
    없으면 **테마색 자동 커버**(post id 결정적 + 3-bar 마크 = 시그니처). → 이미지 강제 없이 그리드 균일.
  - 정보는 `FeedCard` 와 동일: 대표 태그 · 작가 · 날짜 · ♥좋아요(>0) · 👁조회수(≥10, `public-metrics` 규칙) · 북마크.
  - `DiscoveryGrid` / `DiscoveryCell` — CSS columns 메이슨리(모바일 2 → 4열).
- `feed-infinite.tsx` — `variant?: "list" | "grid"` 추가. **기본 "list"(기존 면 전부 보존)**, "grid" 일 때만 그리드.
- `app/[locale]/blog/page.tsx` — **최신/검색 flat 피드만** 와이드 그리드(`max-w-6xl`, rail 생략). 인기(주제별 carousel)·
  팔로잉·시리즈·작가 페이지·태그 페이지는 **그대로**.
- featured(오늘의 글) = 더 큰 타일(columns 는 span 불가 → 높이로 강조).
- **카드 변형 규칙(결정적)**: ogImageUrl 있으면 `cover`(사진) · 없고 excerpt 있으면 `text`(소개글 표시) ·
  둘 다 없으면 `auto`(테마색 자동커버 = 우리 UI + 3-bar 마크). 리치 멀티스톱 그라데이션 + sheen.
- **태그 필터**(Phase 2 일부 선반영): 카드의 `#태그` 클릭 → `?tag=` 로 그 태그만 필터(flat 그리드),
  상단 활성 칩 + 해제(✕). `listFeedByTag` (mock/실 BE 모두 지원). 페이지네이션도 tag 유지.
- **시리즈 카드**: 그리드에선 accent 틴트 박스 타일로 감싸 일반 글 카드와 구분(개선).

### 검증
- `tsc` ✅, `next lint` ✅, `vitest` 389 passed / 1 failed.
  - 1 failed = `lib/i18n-literals.test.ts` → `app/[locale]/p/[username]/[slug]/opengraph-image.tsx` 의
    하드코딩 "분 읽기"/"分で読めます". **기존 이슈(HEAD 에서도 실패), 이 작업과 무관.** OG 라우트의 의도적
    인라인이라 별도 정리 권장.
- mock 모드 렌더 확인: `/ko/blog`(최신 그리드) · 모바일 2열 · 다크 · `?sort=trending`(인기 carousel 유지) · `/ko/p/{user}`(작가 리스트 유지).

## 후속 (별도 작업)
- **Phase 2 — 탭×태그 합성 + URL 동기화**: 태그 칩(인기 `/public/tags` + 로그인 시 관심 태그 pin) ×
  `?sort=&tag=`, 활성칩+해제. BE: `GET /feed/following?tag=` (tag 파라미터 추가).
- **Phase 3 — 피드 기본값 설정**: 설정에 기본 탭(최신 기본)·관심 태그. BE 신규 `GET/PUT /users/me/feed-prefs`.
- **Phase 4 (선택) — 자동커버 생성**: 이미지 없는 글에 OG식 표지 생성(기존 OG 파이프라인 재활용) → 모든 카드 커버.

## 백엔드 계약
| 엔드포인트 | 상태 |
|---|---|
| `GET /public/tags?limit` (인기 태그) | ✅ 있음 |
| `GET /public/posts?sort=&tag=&page&size` | ✅ 있음 |
| `GET /feed/following` (작가+시리즈+팔로우 주제 통합) | ✅ 있음 (tag 파라미터 불필요 — 서버가 followed 태그 자동 합류) |
| `GET/PUT /users/me/feed-prefs` | ⚠️ Phase 3 |
| 자동커버 생성 | ⚠️ Phase 4 |

## 알려진 미세 이슈 (후속 폴리시)
- CSS `columns` 메이슨리는 칼럼 끝 높이 불균형 + 읽기 순서(a11y)가 세로 우선 → 필요 시 grid/JS 메이슨리로.
- 좁은 카드에서 메타(작가·날짜·♥·👁) 줄바꿈 → 좁을 때 조회수 생략 등 우선순위 조정.
- 발견 면에서 rail(추천 작가) 생략 → 상단 칩 strip + 추천 섹션으로 흡수 검토(Phase 2).

## 팔로우 통합 — 작가 + 주제 한 피드로 (Option 1, FE+BE)
"팔로우"라는 한 동사가 작가는 피드 탭으로, 주제(태그)는 점프 링크+숨김 필터로 갈라져 결과가 예측 불가능했던
문제(일관성·정보 향기 위반)를 해소. **팔로잉 탭 = 내가 팔로우한 작가 + 구독 시리즈 + 팔로우한 주제의 통합 피드**.

- **BE (short-link)**: `/feed/following` 의 union 쿼리에 태그 축 추가 —
  `findPublishedByAuthorsSeriesOrTags(authorIds, seriesIds, tags)` (`left join p.tags t` + `lower(t) in :tags`,
  `distinct`). 팔로우 태그는 `tag-prefs` 의 followed 를 lower-case 로 합류. 빈 축은 no-match 센티넬.
  FE 계약(엔드포인트·응답)은 **그대로** — 주제 글이 자동으로 합류만 됨.
- **FE**: 팔로잉 탭 필터를 `FollowFilterChips` 로 — 사람(@핸들) + 주제(#태그)를 한 줄에, 한 번에 하나 활성(상호 배타).
  주제 칩은 `useTagPrefs().followed` 중 **이 피드에 실제 글이 있는 것**만 노출. 떠다니던 `MyTagsStrip` 은 팔로잉
  탭에서 숨김(중복 제거), 최신/인기/시리즈에선 주제 점프 shortcut 으로 유지.
- mock: `mockFollowingView` 가 union 을 흉내(팔로우 작가 + 데모 주제 "일상"), `tag-prefs` 읽기/토글 mock 추가.

## UX 검토 반영 (독립 4-세션 리뷰 → P0/P1 핵심)
- **브랜드 색 통일**: 카드 자동커버(`COVER_GRADS`)·시리즈 덱(`EP_GRADS`) 모두 무지개 → single-accent(emerald)+slate
  패밀리로. 그리드 한 화면이 한 가지 색 언어로 읽힌다.
- **포커스 가시화(WCAG 2.4.7)**: 전면 링크 카드에 `focus-within:ring-2 ring-accent-500` + offset(다크 대응).
  글 카드·시리즈 앞면 카드 모두.
- **대비**: cover scrim 상·하단 통일, 시리즈 에피소드 카운트 `/55`→`/70`.
- **죽은 태그클릭 수정**: 카드 `#태그` → `?sort=recent&tag=` (팔로잉/시리즈 탭에선 `?tag=` 만으론 필터가 안 먹어
  죽은 링크였음 → 항상 작동하는 최신+태그 그리드로 못박음).
- **시리즈 자동넘김 접근성/성능**: 뷰포트 밖(IntersectionObserver)·백그라운드 탭(visibilitychange) 정지,
  `prefers-reduced-motion` 런타임 `change` 구독, 현재 편을 `aria-live`(sr-only)로 안내.
- **작가 필터 칩**: "전체 보기" `aria-pressed`, 터치 타깃 `min-h-[34px]`, 모션 토큰(--ease·200ms) 통일.
- **후속(미적용, 사용자 확인 필요)**: CSS columns 메이슨리 → 행순서 그리드(읽기 순서 a11y), 작가 필터 `?author=` URL 동기화.

## 모션·표면 토큰 (일관성 규칙)

발견 피드 컴포넌트(DiscoveryCard·DiscoverySeriesCard·AuthorFilterChips·TrendingTopics)는 다음 토큰으로 통일한다. **새 요소도 반드시 이 값에서 고를 것** — 임의 radius/shadow/duration/easing 금지.

- **radius**: 카드 `rounded-2xl`(16) · 칩 `rounded-full` · 카드 내부 미디어 `rounded-xl`(12)
- **shadow**: 카드 공통 `shadow-[0_1px_3px_rgba(15,23,42,0.06)]` (시스템 은은한 값). 무거운 floating shadow 금지 — 깊이/스택감은 offset·scale·ring 으로.
- **easing**: 모든 transition/animation = `var(--ease)` (= `cubic-bezier(0.16,1,0.3,1)`, globals.css). `ease-out` 등 임의 easing 금지.
- **duration**: micro/hover = `300ms` · 큰 이동(시리즈 카드 넘김) = `500ms`. 이 2단계만 사용.
- **hover(카드)**: `-translate-y-0.5` (lift) + 이미지 `scale-[1.03]`, 둘 다 `duration-300 ease-[var(--ease)]`.
- **칩**: filled slate(`bg-slate-100`)·`rounded-full`, 활성 = `bg-accent-600 text-white`. (시스템 칩 언어와 동일)
