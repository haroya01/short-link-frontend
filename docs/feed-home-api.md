# 블로그 피드 홈 — API 계약 (`/{locale}/blog`, 예: `?sort=recent`)

이 문서는 **공개 피드 홈 한 화면**(`blog.kurl.me/{locale}` → `app/[locale]/blog/page.tsx`)과 그 화면에서 도달 가능한 상태(최신/인기/팔로잉 탭, 검색, 무한스크롤, 추천 작가 팔로우)가 호출하는 **모든 백엔드 엔드포인트**를 정리한다. 프론트는 현재 `NEXT_PUBLIC_USE_MOCKS=1` 로 `modules/blog/api/_mocks.ts` 의 픽스처를 써서 백엔드 없이 최종 형태로 렌더된다. 아래 "Mock" 열은 현재 목으로 대체된 항목.

표기: `[public]` 인증 불필요 · `[auth]` 액세스 토큰(쿠키) 필요 · `[cookie]` 공유 refresh 쿠키.

## 1. 서버 렌더(RSC, 페이지 로드 시 1회)

| # | Method · Path | 응답 | 용도 | 인증 | Mock |
|---|---|---|---|---|---|
| 1 | `GET /api/v1/public/posts?sort={recent\|trending}&page&size` | `PublicFeedView` | 메인 피드(최신/인기). featured + 그리드 seed | public | ✅ |
| 2 | `GET /api/v1/public/tags?limit` | `TagCount[]` | 인기 태그 (데스크톱 rail + 모바일 strip) | public | ✅ |
| 3 | `GET /api/v1/public/authors?limit` | `SuggestedAuthor[]` | 추천 작가 (rail + strip + 팔로잉 빈 상태) | public | ✅ |

검색/태그 변형은 #1 의 쿼리 파라미터로 흡수:
- 검색: `GET /api/v1/public/posts?q={term}&sort&page&size`
- 태그: `GET /api/v1/public/posts?tag={tag}&page&size`

### 1-b. 인기 탭 — 주제별 인기 (신규)

| # | Method · Path | 응답 | 용도 | 인증 | Mock |
|---|---|---|---|---|---|
| 1b | `GET /api/v1/public/feed/trending-by-tag?tagLimit={n}&perTag={m}` | `TrendingTagSection[]` | 인기 탭의 "주제별 인기" 행 (태그 1개 = 가로 스크롤 1행) | public | ✅ |

```ts
interface TrendingTagSection {
  tag: string;
  postCount: number;        // 태그의 전체 발행 글 수 ("더보기"용)
  posts: PublicFeedItem[];  // 태그 내 인기순 상위 글 (perTag 개)
}
```

백엔드 책임: 태그·글 인기 랭킹 + **콜드스타트 가드**(글 2개 미만 태그 행은 제외 — 젊은 피드에서 빈 행 방지). 미구현 시 프론트는 `?sort=trending` 평면 피드로 폴백 가능(현재는 이 엔드포인트 mock). `tagLimit` 기본 6, `perTag` 기본 8. "더보기"는 기존 `/tags/{tag}` 로 연결.

## 2. 클라이언트(하이드레이션 이후 / 인터랙션)

| # | Method · Path | 응답 | 용도 | 인증 | Mock |
|---|---|---|---|---|---|
| 4 | `GET /api/v1/users/me` | `Me` | 헤더 로그인/로그아웃 분기, 팔로잉 탭 게이트 | auth (익명 시 401) | 미적용(익명) |
| 5 | `POST /api/v1/auth/refresh` | `{token}` | 공유 `.kurl.me` 쿠키로 세션 복구(부트스트랩) | cookie | 미적용 |
| 6 | `GET /api/v1/public/posts?sort&page={N}&size` (+`q`/`tag`) | `PublicFeedView` | 무한스크롤 "더 보기"(`FeedInfinite`) | public | ✅(1페이지, hasNext=false) |
| 7 | `GET /api/v1/feed/following?page&size` | `PublicFeedView` | 팔로잉 탭 피드 | auth | ✅ |

## 3. 팔로우 액션(추천 작가 / 작성자에서 도달)

| # | Method · Path | 응답 | 용도 | 인증 | Mock |
|---|---|---|---|---|---|
| 8 | `GET /api/v1/users/{username}/follow` | `FollowStatus` | 팔로우 상태 + 카운트 | public(읽기) | 미적용 |
| 9 | `PUT /api/v1/users/{username}/follow` | `FollowStatus` | 팔로우 | auth | 미적용 |
| 10 | `DELETE /api/v1/users/{username}/follow` | `FollowStatus` | 언팔로우 | auth | 미적용 |

## 4. 인증/세션(헤더)

| # | Method · Path | 용도 | 인증 |
|---|---|---|---|
| 11 | `GET /oauth2/authorization/google` (백엔드 리다이렉트) | Google 로그인 시작 | oauth |
| 12 | `POST /api/v1/auth/logout` | 로그아웃 | auth |

> 검색 제출은 새 API 없음 — `?q=` 로 soft-nav 후 #1(`q`)이 서버에서 결과 렌더. OG 이미지는 백엔드 아님(`GET /{locale}/blog/opengraph-image`, Next 라우트).

## 5. 응답 타입 (출처: `modules/blog/api/public-posts.ts`, `follows.ts`, `types/auth.ts`)

```ts
interface PublicFeedView { items: PublicFeedItem[]; page: number; size: number; hasNext: boolean }

interface PublicFeedItem {
  author: PublicAuthor;
  slug: string;
  title: string;
  excerpt: string | null;
  ogImageUrl: string | null;     // null → 프론트가 모노 fallback 커버 렌더
  languageTag: string;           // "ko" | "ja" | "en" ...
  tags: string[];
  publishedAt: string;           // ISO instant
  viewCount: number;
  likeCount: number;
}

interface PublicAuthor { id: number; username: string; bio: string | null; avatarUrl: string | null }
interface TagCount { tag: string; count: number }
interface SuggestedAuthor { author: PublicAuthor; postCount: number }
interface FollowStatus { following: boolean; followerCount: number; followingCount: number }

type Me = {
  id: number; email: string; role: "USER" | "ADMIN";
  username?: string | null; tier?: "FREE" | "PRO";
  provider?: string; oauthProvider?: string; timezone?: string;
  createdAt: string; subscriptionCurrentPeriodEnd?: string | null;
}
```

## 6. 정렬/페이징 규약(프론트 기대치)

- `sort`: `recent`(기본) | `trending`. `following` 정렬은 별도 엔드포인트(#7). 검색 시 `following`→`recent` 로 collapse(프론트에서 팔로잉 탭 비활성).
- `page` 0-base, `size` 기본 24. `hasNext` 로 무한스크롤 종료 판단(총 개수 필드 없음 → 프론트는 마지막 페이지에서만 정확한 검색 결과 개수 표시).
- 검색은 제목·excerpt·태그·작성자 핸들 대상(프론트 placeholder "글, 태그, 작성자 검색"과 일치해야 함).

## 7. 추후(보류) — 본 화면 범위 밖
- 태그 기반 + 지역/위치별 개인화 피드(고급 알고리즘). 도입 시 #1 을 대체/보강하는 개인화 엔드포인트 또는 `sort=for-you` 류로 확장 예상. 현재 화면엔 미반영.
