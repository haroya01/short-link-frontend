/**
 * Mock data layer for the public blog feed — lets the feed home render in its final form without a
 * backend. Gated by `NEXT_PUBLIC_USE_MOCKS=1`; when off, the real `fetchPublic`/`request` calls run
 * unchanged. Lives under `modules/` (the i18n-literal guard only scans app/components/hooks/lib), so
 * the Korean fixture copy here is fine.
 *
 * Covers everything the `?sort=recent` feed home and its reachable states (trending, search, tag,
 * following) consume: feed pages, popular tags, suggested authors. Posts deliberately mix
 * cover-image and image-less (monochrome fallback) cards, and span product / dev / daily-life tags.
 */
import type {
  PublicAuthor,
  PublicFeedItem,
  PublicFeedView,
  SuggestedAuthor,
  TagCount,
  TrendingTagSection,
} from "@/modules/blog/api/public-posts";

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

const img = (seed: string) => `https://picsum.photos/seed/${seed}/800/500`;
const avatar = (n: number) => `https://i.pravatar.cc/120?img=${n}`;

const AUTHORS: Record<string, PublicAuthor> = {
  dohyun: { id: 1, username: "dohyun", bio: "백엔드 개발자 · 사이드 프로젝트 중독", avatarUrl: avatar(12) },
  minji: { id: 2, username: "minji", bio: "1인 메이커 · 그로스", avatarUrl: avatar(45) },
  haruka: { id: 3, username: "haruka", bio: "플랫폼 엔지니어", avatarUrl: null },
  kazuki: { id: 4, username: "kazuki", bio: "여행하며 코드 짜는 사람", avatarUrl: avatar(33) },
  sora: { id: 5, username: "sora", bio: "프로덕트 디자이너", avatarUrl: null },
};

type Seed = {
  slug: string;
  title: string;
  excerpt: string;
  author: keyof typeof AUTHORS;
  tags: string[];
  cover?: string;
  views: number;
  likes: number;
  day: number; // 2026-05-DD
};

// Newest first. The lead (with a cover) becomes the featured card; image-less posts render the
// monochrome fallback cover in the grid.
const SEEDS: Seed[] = [
  { slug: "nextjs-14-app-router-blog", title: "Next.js 14 App Router로 블로그를 다시 만든 이유", excerpt: "RSC와 서버 액션으로 피드·검색·작성 흐름을 다시 짠 과정과 트레이드오프.", author: "dohyun", tags: ["개발", "nextjs"], cover: img("kurl-next"), views: 1840, likes: 62, day: 30 },
  { slug: "pricing-experiment-free-to-pro", title: "1인 개발자의 가격 정책 실험: 무료에서 Pro까지", excerpt: "전환율을 보며 무료 한도와 Pro 경계를 네 번 바꾼 기록.", author: "minji", tags: ["상품", "그로스"], cover: img("kurl-pricing"), views: 2210, likes: 88, day: 29 },
  { slug: "hexagonal-too-much", title: "헥사고날 아키텍처, 작은 서비스에 과했을까", excerpt: "포트·어댑터로 갈라놓고 6개월 뒤 다시 본 솔직한 회고.", author: "haruka", tags: ["개발", "아키텍처"], views: 1530, likes: 41, day: 28 },
  { slug: "kyoto-workation", title: "교토에서 한 달 살기: 워케이션 회고", excerpt: "낮엔 카페에서 코드, 밤엔 산책. 생산성과 외로움 사이의 균형.", author: "kazuki", tags: ["일상", "여행"], cover: img("kurl-kyoto"), views: 990, likes: 57, day: 27 },
  { slug: "design-tokens-to-tailwind", title: "디자인 시스템 토큰을 Tailwind로 옮기며", excerpt: "Figma 변수 → CSS 변수 → Tailwind theme. 손실 없이 잇는 법.", author: "sora", tags: ["디자인", "개발"], views: 760, likes: 33, day: 26 },
  { slug: "spring-tx-propagation", title: "Spring Boot 트랜잭션 전파, 다시 정리", excerpt: "REQUIRES_NEW가 만든 버그를 추적하며 전파 옵션을 처음부터 다시.", author: "dohyun", tags: ["개발", "spring"], views: 1320, likes: 39, day: 25 },
  { slug: "killed-side-project", title: "사이드 프로젝트를 6개월 만에 접은 이야기", excerpt: "지표·동기·기회비용. 접는 결정을 데이터로 내린 과정.", author: "minji", tags: ["회고", "상품"], cover: img("kurl-killed"), views: 3050, likes: 121, day: 24 },
  { slug: "typescript-generics-hard", title: "타입스크립트 제네릭이 어려운 진짜 이유", excerpt: "추론이 무너지는 지점들을 예제로 짚어본다.", author: "haruka", tags: ["개발", "typescript"], views: 1410, likes: 47, day: 23 },
  { slug: "weekend-hiking-burnout", title: "주말 등산 기록, 그리고 번아웃", excerpt: "정상에서 깨달은 것: 쉬는 것도 일정이다.", author: "kazuki", tags: ["일상"], views: 540, likes: 29, day: 22 },
  { slug: "posthog-funnel", title: "PostHog로 퍼널 분석 붙이기", excerpt: "가입 → 첫 링크 → 공유. 이탈 지점을 숫자로 본 뒤 바뀐 것.", author: "sora", tags: ["상품", "분석"], cover: img("kurl-posthog"), views: 1180, likes: 36, day: 21 },
  { slug: "naming-things", title: "리팩터링: 이름 짓기에 하루를 쓰는 이유", excerpt: "좋은 이름은 주석을 지운다. 실제 PR로 본 before/after.", author: "dohyun", tags: ["개발", "리팩터링"], views: 870, likes: 44, day: 20 },
  { slug: "coffee-routine", title: "커피 한 잔의 루틴, 생산성에 대하여", excerpt: "의식을 만들면 시작이 쉬워진다. 6개월의 작은 실험.", author: "minji", tags: ["일상"], views: 620, likes: 25, day: 19 },
];

function toItem(s: Seed): PublicFeedItem {
  return {
    author: AUTHORS[s.author],
    slug: s.slug,
    title: s.title,
    excerpt: s.excerpt,
    ogImageUrl: s.cover ?? null,
    languageTag: "ko",
    tags: s.tags,
    publishedAt: `2026-05-${String(s.day).padStart(2, "0")}T09:00:00Z`,
    viewCount: s.views,
    likeCount: s.likes,
  };
}

const ALL_ITEMS = SEEDS.map(toItem);

/** A single page of the feed. `hasNext` stays false so the one mock page renders cleanly (no
 *  load-more round-trip to a backend that isn't there). */
export function mockFeedView({
  sort = "recent",
  q,
  tag,
}: {
  sort?: "recent" | "trending";
  q?: string;
  tag?: string;
} = {}): PublicFeedView {
  let items = [...ALL_ITEMS];
  if (tag) items = items.filter((i) => i.tags.includes(tag));
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter(
      (i) =>
        i.title.toLowerCase().includes(needle) ||
        (i.excerpt ?? "").toLowerCase().includes(needle) ||
        i.tags.some((t) => t.toLowerCase().includes(needle)) ||
        i.author.username.toLowerCase().includes(needle),
    );
  }
  if (sort === "trending") items = [...items].sort((a, b) => b.viewCount - a.viewCount);
  return { items, page: 0, size: 24, hasNext: false };
}

export const MOCK_POPULAR_TAGS: TagCount[] = [
  { tag: "개발", count: 8 },
  { tag: "상품", count: 3 },
  { tag: "일상", count: 3 },
  { tag: "디자인", count: 2 },
  { tag: "회고", count: 1 },
  { tag: "spring", count: 1 },
  { tag: "nextjs", count: 1 },
  { tag: "typescript", count: 1 },
  { tag: "아키텍처", count: 1 },
  { tag: "여행", count: 1 },
  { tag: "분석", count: 1 },
  { tag: "리팩터링", count: 1 },
];

export const MOCK_SUGGESTED_AUTHORS: SuggestedAuthor[] = [
  { author: AUTHORS.dohyun, postCount: 3 },
  { author: AUTHORS.minji, postCount: 3 },
  { author: AUTHORS.haruka, postCount: 2 },
  { author: AUTHORS.kazuki, postCount: 2 },
  { author: AUTHORS.sora, postCount: 2 },
];

/** Following feed (the 팔로잉 tab, when signed in) — posts from a couple of "followed" authors. */
export function mockFollowingView(): PublicFeedView {
  const items = ALL_ITEMS.filter((i) => ["dohyun", "minji"].includes(i.author.username));
  return { items, page: 0, size: 24, hasNext: false };
}

/**
 * Popular posts grouped by tag — the 인기 tab's "주제별 인기" rows. Groups every post by each of its
 * tags, ranks posts within a tag by views, and orders the tag rows by how many posts they hold.
 * Tags with fewer than 2 posts are dropped so a young feed doesn't render near-empty rows.
 */
export function mockTrendingByTag(tagLimit = 6, perTag = 8): TrendingTagSection[] {
  const byTag = new Map<string, PublicFeedItem[]>();
  for (const item of ALL_ITEMS) {
    for (const tag of item.tags) {
      const list = byTag.get(tag) ?? [];
      list.push(item);
      byTag.set(tag, list);
    }
  }
  return [...byTag.entries()]
    .filter(([, posts]) => posts.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, tagLimit)
    .map(([tag, posts]) => ({
      tag,
      postCount: posts.length,
      posts: [...posts].sort((a, b) => b.viewCount - a.viewCount).slice(0, perTag),
    }));
}
