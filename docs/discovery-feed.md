# 발견 피드 리뉴얼 — 카드 그리드 (Phase 1 적용 + 후속 플랜)

크리에이터/블로그 무게중심 로드맵의 "발견(Discovery)" 작업. 블로그 홈의 **둘러보기(browse) 면**을
리스트 → **메이슨리 카드 그리드**로 바꾼다. 읽기(reading) 면(글·작가·태그)은 컬럼 유지.

## ⚠️ 결정: AGENTS.md §10.1 (reading-column 불변식)의 예외
`ReadingShell` / AGENTS.md §10.1 은 "피드 본문은 모든 면에서 `max-w-2xl` 단일 컬럼"을 불변식으로 둔다
(`FeedList` 주석도 *"a quiet weblog reads as a vertical list, NOT a multi-column card grid"*).
이번 변경은 **발견 면(블로그 홈 최신/검색)에 한해 그 불변식을 예외**로 둔다 — browse 면은 그리드가 맞고,
read 면은 컬럼이 맞다는 판단. **AGENTS.md §10.1 에 이 예외를 명문화 필요** (이 PR에는 미포함).

## Phase 1 — 적용 완료 (이 브랜치, FE only, 백엔드 0)
- 신규 `modules/blog/components/discovery-card.tsx`
  - `DiscoveryCard(item, locale, featured?)` — `PublicFeedItem` 1개를 타일로. ogImageUrl 있으면 **사진 커버**,
    없으면 **테마색 자동 커버**(post id 결정적 + 3-bar 마크 = 시그니처). → 이미지 강제 없이 그리드 균일.
  - 정보는 `FeedCard` 와 동일: 대표 태그 · 작가 · 날짜 · ♥좋아요(>0) · 👁조회수(≥10, `public-metrics` 규칙) · 북마크.
  - `DiscoveryGrid` / `DiscoveryCell` — CSS columns 메이슨리(모바일 2 → 4열).
- `feed-infinite.tsx` — `variant?: "list" | "grid"` 추가. **기본 "list"(기존 면 전부 보존)**, "grid" 일 때만 그리드.
- `app/[locale]/blog/page.tsx` — **최신/검색 flat 피드만** 와이드 그리드(`max-w-6xl`, rail 생략). 인기(주제별 carousel)·
  팔로잉·시리즈·작가 페이지·태그 페이지는 **그대로**.
- featured(오늘의 글) = 더 큰 타일(columns 는 span 불가 → 높이로 강조). 시리즈 interleave = 그리드 셀 1개.

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
| `GET /feed/following?tag=&page&size` | ⚠️ Phase 2 |
| `GET/PUT /users/me/feed-prefs` | ⚠️ Phase 3 |
| 자동커버 생성 | ⚠️ Phase 4 |

## 알려진 미세 이슈 (후속 폴리시)
- CSS `columns` 메이슨리는 칼럼 끝 높이 불균형 + 읽기 순서(a11y)가 세로 우선 → 필요 시 grid/JS 메이슨리로.
- 좁은 카드에서 메타(작가·날짜·♥·👁) 줄바꿈 → 좁을 때 조회수 생략 등 우선순위 조정.
- 발견 면에서 rail(추천 작가) 생략 → 상단 칩 strip + 추천 섹션으로 흡수 검토(Phase 2).
