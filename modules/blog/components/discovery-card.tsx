"use client";
/* eslint-disable @next/next/no-img-element */

import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link as TransitionLink } from "next-view-transitions";
import { blogPath } from "@/lib/host";
import { DATE_LOCALE } from "@/lib/date";
import type { FollowReason, PublicFeedItem } from "@/modules/blog/api/public-posts";
import { isRenderablePost, showLikes } from "@/modules/blog/lib/public-metrics";
import { isDisplayableTag } from "@/modules/blog/lib/tag-normalize";
import { postHref, authorHref } from "@/modules/blog/components/feed-card";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { CoverMorphLink } from "@/modules/blog/components/cover-morph-link";
import { FeedCardBookmark } from "@/modules/blog/components/feed-card-bookmark";
import { PostBelongingLine } from "@/modules/blog/components/post-belonging-line";
import { BelongingProvider } from "@/modules/blog/components/post-belonging-context";
import { CoverThumb } from "@/modules/blog/components/cover-thumb";

// "속함" 한 올(모든 카드가 그물의 매듭임을 보여주는 한 줄) — 기본 ON. 카드마다 개별 fetch(N+1) 였던
// 초기 우려는 배치 엔드포인트로 해소됐다: 보이는 카드들의 id 를 BelongingProvider(DiscoveryGrid 안)
// 가 모아 한 번에 조회하고, 담긴 게 없는 글은 줄 자체를 안 그린다. 끄고 싶으면 플래그로 명시적으로만.
const SHOW_BELONGING = process.env.NEXT_PUBLIC_FEED_BELONGING !== "0";

/**
 * Discovery feed card — the *browse* surface (blog home 최신 / 검색), vs the *reading* surfaces
 * (post / author / tags) which keep the AGENTS.md §10.1 single-column list.
 *
 * Variant rule (deterministic — same post always renders the same way):
 *   - has ogImageUrl                  → "cover"  (사진이 카드 전체 배경 + 제목 오버레이)
 *   - no image, has excerpt           → "text"   (소개글을 보여주는 깔끔한 글 카드)
 *   - no image, no excerpt            → "auto"   (테마색 자동 커버 = 우리 UI + 3-bar 마크)
 * → 이미지 강제 없이 그리드가 균일하면서, 글만 있는 포스트는 소개글이 보이고, 표지/소개 둘 다 없으면
 *   브랜드 자동커버가 채운다.
 *
 * Carries the same info as {@link FeedCard}: 대표 태그(클릭 시 ?tag= 로 필터) · 작가 · 날짜 ·
 * ♥좋아요(>0) · 👁조회수(≥10) · 북마크. Only layout differs.
 */

// timeZone 고정: Vercel(UTC) 프리렌더와 KST 방문자 하이드레이션이 UTC 자정 경계의 글에서
// 다른 날짜 텍스트를 만들어 React #425(hydration mismatch)가 터졌다. 발행일은 플랫폼 시간대
// (Asia/Seoul) 기준 절대 날짜로 고정 — 서버/클라이언트가 항상 같은 문자열을 그린다.
function fmtDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" });
}
// 카드 #태그 = 주제의 정식 목적지인 /tags/[tag] 읽기 페이지. 이전엔 ?sort=recent&tag= 그리드
// 필터였는데, 같은 #태그 affordance 가 화면에 따라 세 목적지(recent 필터·trending 필터·읽기
// 페이지)로 갈라져 있었다. 규칙을 하나로: #태그 텍스트는 어디서든 /tags/[tag], in-place 필터는
// active 상태를 가진 칩 스트립(TrendingTopics)만. 팔로잉/시리즈 탭에서 ?tag= 가 안 먹어 sort 를
// 못박던 핵도 함께 사라진다.
const tagHref = (tag: string) => blogPath(`/tags/${encodeURIComponent(tag)}`);

/** featured(오늘의 글) 신호 — 그리드에서 "왜 이 타일만 큰지"를 설명한다(모바일 리스트의 eyebrow 와
 *  같은 언어). 라이브 펄스 점(.live-dot)이 "지금"임을 조용히 말하고, reduced-motion 은 정지. */
function FeaturedBadge({ label, over }: { label: string; over?: boolean }) {
  return (
    <span
      className={
        over
          ? "inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-900 shadow-sm backdrop-blur"
          : "inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-700 dark:text-accent-400"
      }
    >
      <span aria-hidden className="live-dot relative h-1.5 w-1.5 rounded-full bg-accent-600" />
      {label}
    </span>
  );
}

function TagLink({ tag, over }: { tag: string; over?: boolean }) {
  return (
    <BlogLink
      href={tagHref(tag)}
      // Padding + negative margin: grows the tap box past the 24px minimum without moving a
      // pixel visually — these bare-text chips sat at ~16px tall and failed target-size on touch.
      className={`pointer-events-auto -mx-1.5 -my-1.5 rounded px-1.5 py-1.5 text-[12px] font-medium transition hover:underline ${
        over ? "text-white/85 hover:text-white" : "text-slate-500 hover:text-accent-600 dark:text-slate-400"
      }`}
    >
      #{tag}
    </BlogLink>
  );
}

// 통합 팔로잉 피드에서 "왜 떴는지" 배지 — 팔로우한 주제/구독 시리즈로 들어온 글에만(작가 팔로우는 자명해
// 생략). followReason 은 팔로잉 피드에서만 채워지므로 다른 면에선 자동으로 안 보인다.
function ReasonPill({
  reason,
  over,
  t,
}: {
  reason: FollowReason;
  over?: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  if (reason.kind === "AUTHOR") return null;
  const label = reason.kind === "TOPIC" ? t("feedReasonTopic", { tag: reason.tag ?? "" }) : t("feedReasonSeries");
  return (
    <span
      className={`pointer-events-none inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        over ? "bg-white/15 text-white/90 backdrop-blur-sm" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
      }`}
    >
      {label}
    </span>
  );
}

function CardMeta({ item, locale, over }: { item: PublicFeedItem; locale: string; over?: boolean }) {
  const tone = over ? "text-white/85" : "text-slate-500 dark:text-slate-400";
  return (
    <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] ${tone}`}>
      <BlogLink
        href={authorHref(item.author.username, locale)}
        className="pointer-events-auto -mx-1 -my-1.5 flex min-w-0 items-center gap-1.5 rounded px-1 py-1.5 transition-opacity hover:opacity-80"
      >
        <Avatar src={item.author.avatarUrl} name={item.author.username} size="xs" />
        <span className="truncate font-medium">{item.author.username}</span>
      </BlogLink>
      <span aria-hidden>·</span>
      <time dateTime={item.publishedAt} className="shrink-0">
        {fmtDate(item.publishedAt, locale)}
      </time>
      {/* 조회수는 카드에서 제거(§10.2 와 동일 규칙으로 통일) — 작은 카드에 숫자 신호는 하나(좋아요)면 충분. */}
      {showLikes(item.likeCount) && (
        <span className="flex shrink-0 items-center gap-0.5">
          <Heart className={`ml-0.5 h-3 w-3 ${over ? "" : "text-accent-600"}`} />
          {item.likeCount}
        </span>
      )}
    </div>
  );
}

// 카드 공통 surface/motion 토큰 — rounded-card-lg(그리드/커버 카드 표준 16px), --ease, 300ms. 입체감:
// 다층 그림자(닿는 면 가까운 1px + 퍼지는 ambient)로 평면이 아니라 살짝 떠 있게, hover 시 -translate-y-1
// 로 깊게 떠오르며 그림자 확장. focus-within ring = 전면 링크 카드의 키보드 포커스 가시화(WCAG 2.4.7).
const SHELL =
  "group relative overflow-hidden rounded-card-lg transition-[transform,box-shadow] duration-300 ease-[var(--ease)] hover:-translate-y-1 hover:shadow-card-hover motion-reduce:transform-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-600 has-[:focus-visible]:ring-offset-2 dark:has-[:focus-visible]:ring-offset-slate-950";
const CARD_SHADOW = "shadow-card";

export function DiscoveryCard({
  item,
  locale,
  featured = false,
  eager = false,
}: {
  item: PublicFeedItem;
  locale: string;
  featured?: boolean;
  /** Above-fold card: load the cover eagerly. Lazy covers in the first viewport made the feed's
   *  LCP image wait for hydration + IntersectionObserver — Lighthouse modeled that as LCP ≈ TTI. */
  eager?: boolean;
}) {
  const t = useTranslations("publicFeed");
  // A blank-title, no-excerpt post is effectively empty — skip it rather than render a hollow cell.
  // After the hook call so the rules of hooks hold (this component always calls useTranslations).
  if (!isRenderablePost(item)) return null;
  const postUrl = postHref(item.author.username, item.slug, locale);
  const hasImage = Boolean(item.ogImageUrl);
  // First DISPLAYABLE tag — skip junk (incomplete jamo, single-char, mash) so the card's one-tag
  // chip never surfaces "#ㄴ" / "#dddd" as a clickable, indexable link.
  const tag = item.tags.find(isDisplayableTag);
  const reason = item.followReason ?? null;
  // 카드 변형(결정적): 사진 있으면 cover, 없으면 text(흰 타이포 카드 — 소개글은 있을 때만 한 단락).
  // 이전의 auto(그린 그라디언트 자동표지)는 폐기: 텍스트 위주 피드에서 같은 초록 타일이 도배돼
  // 스캔성이 죽고("그린 월"), 글이 주인인 표면에서 표지가 콘텐츠 행세를 했다. 그린은 마커·밑줄·
  // featured 의 "그린 실"(§10.3)에서만 빛난다. 공유 미리보기는 여전히 OG 자동 생성이 담당(§10.4).
  const variant: "cover" | "text" = hasImage ? "cover" : "text";
  // 카드 → 글 이동에 통일된 은은한 전환(페이드+살짝 스케일, View Transitions). 전 카드 타입(이미지·글·자동)
  // 동일하게 적용 — 소프트 내비(상대경로, dev/path)에서만 동작, 절대경로(prod 서브도메인)는 하드 내비라 미적용.
  const internal = postUrl.startsWith("/");
  const PostLink = internal ? TransitionLink : BlogLink;

  // ── text: 이미지·표지 없이 소개글을 보여주는 글 카드 ──
  if (variant === "text") {
    return (
      <div className={`${SHELL} ${CARD_SHADOW} border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900`}>
        <div className="absolute right-3 top-3 z-20">
          <FeedCardBookmark postId={item.id} username={item.author.username} slug={item.slug} />
        </div>
        <PostLink href={postUrl} aria-label={item.title} className="absolute inset-0 z-10" />
        <div className="pointer-events-none relative z-10 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {featured && <FeaturedBadge label={t("featuredLabel")} />}
            {tag && <TagLink tag={tag} />}
            {reason && <ReasonPill reason={reason} t={t} />}
          </div>
          <h3 className={`text-balance font-semibold leading-snug tracking-tight text-slate-900 dark:text-slate-100 ${featured ? "text-card-title-md" : "text-card-title-xs"}`}>
            {item.title}
          </h3>
          {item.excerpt && (
            <p className="line-clamp-4 text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
              {item.excerpt}
            </p>
          )}
          <CardMeta item={item} locale={locale} />
          {SHOW_BELONGING && <PostBelongingLine postId={item.id} />}
        </div>
      </div>
    );
  }

  // ── cover: 사진이 카드 전체 배경 ──
  // featured 세로 3:4 는 메이슨리(sm+)에서 그리드를 잡아주는 앵커 — 모바일 1열 전폭에선 첫
  // 화면을 통째로 먹어 4:3 로 낮춘다(리드는 유지하되 다음 카드가 폴드 안에 걸리게).
  const ratio = featured ? "aspect-[4/3] sm:aspect-[3/4]" : "aspect-[4/3]";
  // 사진 카드만 커버 모핑(클릭한 커버가 글 히어로로 흘러 들어감) — 텍스트 카드는 모핑할 피사체가
  // 없어 기존 통일 전환을 탄다. 하드 내비(절대경로)는 VT 페어가 못 맺히므로 일반 링크 유지.
  const CoverLink = internal ? CoverMorphLink : BlogLink;

  return (
    // ring-inset white/10: 어두운 커버 가장자리에 유리 같은 얇은 빛 테두리 → 입체감.
    <div data-vt-cover-scope className={`${SHELL} ${CARD_SHADOW} bg-slate-200 ring-1 ring-inset ring-white/10 dark:bg-slate-800`}>
      <div className={ratio}>
        {/* 톤 하모나이즈(상시 고정): 저채도 필터 + 일반 알파 베일. mix-blend-color 는 색 통일이
            더 강했지만 iPad Safari 가 블렌드 영역을 타일로 합성하며 경계선(seam)과 깜빡임을
            그렸다 — 블렌드 모드 없이 filter + 단순 오버레이로(전 브라우저 안정). hover 전환도
            없음(스크롤 중 hover 연사 깜빡임, #693). */}
        {/* 그리드 커버도 원본 대신 뷰포트 열 폭 변형 — 허용 밖 호스트는 원본 폴백(CoverThumb). */}
        <CoverThumb
          src={item.ogImageUrl as string}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          eager={eager}
          vtCover
          className="absolute inset-0 h-full w-full object-cover saturate-[.85] transition-transform duration-300 ease-[var(--ease)] group-hover:scale-[1.03] motion-reduce:transform-none"
        />
        <div aria-hidden className="absolute inset-0 bg-accent-900/10" />
        {/* 텍스트 가독성 scrim — 상·하단 모두(상단 태그, 하단 제목/메타). WCAG 대비 확보용으로 통일. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent" />
        {/* 위에서 빛이 닿는 1px 하이라이트 — 커버가 평면 아니라 살짝 솟은 듯한 입체감. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
      </div>

      <div className="absolute right-3 top-3 z-20 text-white">
        <FeedCardBookmark postId={item.id} username={item.author.username} slug={item.slug} />
      </div>
      {featured && (
        <div className="pointer-events-none absolute left-3 top-3 z-20">
          <FeaturedBadge label={t("featuredLabel")} over />
        </div>
      )}
      <CoverLink href={postUrl} aria-label={item.title} className="absolute inset-0 z-10" />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4">
        <div className="flex flex-wrap items-center gap-2">
          {tag && <TagLink tag={tag} over />}
          {reason && <ReasonPill reason={reason} over t={t} />}
        </div>
        <div className="space-y-2">
          {/* 제목 스케일은 변형(이미지 유무)이 아니라 중요도(featured) 한 축으로만 — 위계 역전 방지. */}
          <h3 className={`line-clamp-3 text-balance font-semibold leading-tight tracking-tight text-white ${featured ? "text-card-title-lg" : "text-card-title-sm"}`}>
            {item.title}
          </h3>
          <CardMeta item={item} locale={locale} over />
          {SHOW_BELONGING && <PostBelongingLine postId={item.id} over />}
        </div>
      </div>
    </div>
  );
}

// 메이슨리 — 카드를 크기대로 빈틈없이 퍼즐처럼 채운다(행 강제 정렬 X, 밑 여백 들쭉날쭉 회피).
// 모바일 1열 → sm 2열 → lg 3열(md 태블릿 세로에서 3열이면 카드가 ~250px로 짜부라져 2열 유지).
// 모바일이 1열인 또 다른 이유는 2열에서 한글 제목이 ~8자에 잘려서다.
//
// 구현: CSS multi-column(column-fill:balance) 을 버리고 flex 컬럼 + 측정 기반 최단열 배치로 바꿨다.
// balance 는 큰 카드(예: "지금 이어지는 것들" 연결 카드)가 한 열에 들어가면 그 열만 크게 늘어나고
// 다른 열 밑을 통째로 비워(사용자 신고: "카드 없는 빈 공간") — 아이템을 쪼갤 수 없는(break-inside)
// 큰 타일이 열 경계에서 다음 열로 튀며 남기는 void 다. flex 컬럼은 각 열이 독립 스택이라 큰 카드는
// 자기 열 밑만 길어질 뿐(정상 메이슨리의 들쭉 밑변) void 를 안 만든다. 마운트 후 실제 높이를 재
// 최단열에 순서대로 넣어 높이까지 고르게 맞춘다.
const GRID_CHUNK = 24;
// Tailwind 브레이크포인트와 일치: <640 = 1열, <1024 = 2열, ≥1024 = 3열.
const BP_SM = 640;
const BP_LG = 1024;
const MAX_COLUMNS = 3;
// 서버·첫 클라 렌더는 1열(모바일 우선)로 그린다 — 폭을 모르는 SSR 에서 3열을 그리면 모바일 첫
// 페인트가 1/3 폭으로 짜부라졌다가(하이드레이션 뒤) 1열로 튀는 깜빡임이 난다. 1열 SSR 은 전 폭에서
// 안전하고, 데스크톱만 마운트 후 3열로 한 번 재배치된다(위→아래 정착, 모바일 짜부라짐 없음).
const SSR_COLUMNS = 1;

function columnsForWidth(w: number): number {
  if (w < BP_SM) return 1;
  if (w < BP_LG) return 2;
  return MAX_COLUMNS;
}

/**
 * 문서순 → 열 배치. heights 가 있으면(마운트 후) 최단열 greedy, 없으면(SSR/첫 렌더) 라운드로빈. 둘 다
 * 결정적이라 heights 없는 동안 서버·클라 마크업이 일치한다.
 *
 * spread(특수 카드: 연결·시리즈 삽입)는 greedy 로 자유 재배치하지 않는다 — 크고(포스트 2~3배 높이)
 * 문서상 서로 가까워, greedy 에 맡기면 같은 열에 뭉쳐 "몇 행마다 하나씩 짜넣기"라는 설계 의도가
 * 깨졌다(사장님 "특수 카드 정렬 이상" 신고). 대신 k 번째 특수 카드를 (그 시점 최단열 + 직전 특수
 * 카드가 쓴 열 회피)로 흩뿌려, 서로 다른 열에 짜여 들게 한다. 일반 포스트는 그대로 최단열 greedy 로
 * 그 주위를 채워 #885 void-fix 를 유지한다.
 */
function distribute(
  count: number,
  cols: number,
  heights: number[] | null,
  isSpread: (i: number) => boolean,
): number[][] {
  const buckets: number[][] = Array.from({ length: cols }, () => []);
  const colH = new Array(cols).fill(0);
  const shortest = (avoid: number) => {
    let min = -1;
    for (let c = 0; c < cols; c++) {
      if (c === avoid && cols > 1) continue;
      if (min === -1 || colH[c] < colH[min]) min = c;
    }
    return min === -1 ? 0 : min;
  };
  let lastSpreadCol = -1;
  for (let i = 0; i < count; i++) {
    let target: number;
    if (!heights) {
      // SSR/첫 렌더: 결정적 라운드로빈(특수 카드도 동일 — 하이드레이션 일치가 최우선).
      target = i % cols;
    } else if (isSpread(i)) {
      // 특수 카드: 최단열에 넣되 직전 특수 카드가 쓴 열은 피해 서로 다른 열로 흩뿌린다.
      target = shortest(lastSpreadCol);
      lastSpreadCol = target;
    } else {
      // 일반 포스트: 순수 최단열 greedy.
      target = shortest(-1);
    }
    buckets[target].push(i);
    if (heights) colH[target] += heights[i] ?? 0;
  }
  return buckets;
}

export function DiscoveryGrid({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const chunks: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += GRID_CHUNK) chunks.push(items.slice(i, i + GRID_CHUNK));
  // 페이지(청크) 단위로 컬럼 블록을 끊어 세로로 잇는다: 새 페이지는 아래 새 블록으로만 쌓이고 앞
  // 블록의 카드 집합은 불변이라 무한스크롤 append 시 이미 보이던 카드가 재배치되지 않는다(청크
  // 경계의 얕은 가로 이음새가 유일한 비용). 청크 크기 = feed 페이지 크기.
  const grid = (
    <div className="flex flex-col gap-4 sm:gap-5">
      {chunks.map((chunk, i) => (
        <MasonryChunk key={i}>{chunk}</MasonryChunk>
      ))}
    </div>
  );
  // One "속함" batch resolver spans the whole grid — every DiscoveryCard's belonging line registers
  // its in-view id here, so a viewport of cards resolves in one request (see BelongingProvider). When
  // the line is off, the provider is a pure passthrough (no id ever registers), so it costs nothing.
  return SHOW_BELONGING ? <BelongingProvider>{grid}</BelongingProvider> : grid;
}

/** 한 페이지(청크)의 카드들을 flex 컬럼 메이슨리로 배치. SSR/첫 렌더는 라운드로빈(결정적, void 없음),
 *  마운트 후 실제 셀 높이를 재 최단열로 재배치해 열 높이를 고르게 맞춘다. */
function MasonryChunk({ children }: { children: ReactNode }) {
  const cells = Children.toArray(children);
  // 특수 카드(DiscoveryCell spread) 위치 — 배치에서 greedy 자유이동 대신 열 흩뿌림으로 다룬다.
  const spreadSet = new Set<number>();
  cells.forEach((cell, i) => {
    if (isValidElement(cell) && cell.type === DiscoveryCell && cell.props?.spread) spreadSet.add(i);
  });
  const [cols, setCols] = useState(SSR_COLUMNS);
  const [heights, setHeights] = useState<number[] | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 뷰포트 폭 → 열 수. 리사이즈(브레이크포인트 통과)마다 재계산.
  useEffect(() => {
    const apply = () => setCols(columnsForWidth(window.innerWidth));
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  // 셀 실제 높이 측정 → 최단열 배치. 리플로우로 노드가 열 사이를 옮겨다녀도 ref 는 원래 인덱스(i)에
  // 고정돼 있어, 매 렌더 현재 ref 들을 다시 관찰한다. 이미지·폰트 로드로 높이가 늦게 바뀌므로
  // ResizeObserver 로 추적하고, 값이 실제로 바뀔 때만 setHeights 해 리플로우 루프를 끊는다.
  const cellCount = cells.length;
  useEffect(() => {
    const measure = () => {
      const nodes = cellRefs.current;
      const hs: number[] = [];
      for (let i = 0; i < cellCount; i++) hs[i] = nodes[i]?.getBoundingClientRect().height ?? 0;
      // 아직 아무 셀도 실측되지 않았으면(전부 0) 라운드로빈 유지 — 0 을 높이로 믿어 한 열에 몰지 않는다.
      if (hs.every((h) => h === 0)) return;
      setHeights((prev) =>
        prev && prev.length === hs.length && prev.every((h, i) => Math.abs(h - hs[i]) < 1) ? prev : hs,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    for (let i = 0; i < cellCount; i++) {
      const n = cellRefs.current[i];
      if (n) ro.observe(n);
    }
    return () => ro.disconnect();
    // cols·cellCount 이 바뀌면 열 폭/셀 수가 달라져 재측정. buckets 변화는 같은 노드 재관찰이라 불필요.
  }, [cellCount, cols]);

  const buckets = distribute(cells.length, cols, heights, (i) => spreadSet.has(i));
  // flex 컬럼: 각 열이 독립 세로 스택 → 큰 카드가 자기 열만 늘리고 다른 열에 void 를 안 만든다.
  // items-start: 기본 stretch 는 짧은 열을 가장 긴 열 높이로 늘려 카드 밑에 빈 칸을 만든다 — 각 열이
  // 콘텐츠 자연 높이만 갖게 해 밑변만 들쭉날쭉(정상 메이슨리)하게 둔다.
  return (
    <div className="flex items-start gap-4 sm:gap-5">
      {buckets.map((idxs, c) => (
        <div key={c} className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-5">
          {idxs.map((i) => (
            <div
              key={i}
              ref={(el) => {
                cellRefs.current[i] = el;
              }}
            >
              {cells[i]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** A child cell of {@link DiscoveryGrid}. 카드 간격은 이제 flex 컬럼의 gap 이 준다(예전 CSS columns
 *  의 mb + break-inside-avoid 는 flex 메이슨리에선 불필요 — 제거). `entranceDelay` 가 오면 마운트 시
 *  짧은 스태거 페이드(fill backwards — 딜레이 동안 안 보이게). 무한스크롤 append 가 "뚝" 나타나는 걸
 *  지우는 용도 — 이미 마운트된 카드는 다시 돌지 않고, reduced-motion 은 globals 의 animate-fade-in
 *  가드가 통째로 끈다. */
export function DiscoveryCell({
  children,
  entranceDelay,
  spread,
}: {
  children: ReactNode;
  entranceDelay?: number;
  /** 특수 카드(연결·시리즈 삽입)를 표시 — 최단열 greedy 로 자유 재배치하지 않고, 문서순대로 서로 다른
   *  열에 흩뿌려(spread) 한 열에 뭉치지 않게 한다. MasonryChunk 가 이 플래그를 읽어 배치를 가른다.
   *  값은 배치 로직에서만 쓰이고 DOM 에는 남지 않는다. */
  spread?: boolean;
}) {
  void spread;
  return (
    <div
      className={entranceDelay != null ? "animate-fade-in" : undefined}
      style={
        entranceDelay != null
          ? { animationDelay: `${entranceDelay}ms`, animationFillMode: "backwards" }
          : undefined
      }
    >
      {children}
    </div>
  );
}

// 로딩 placeholder — 리스트 행이 아니라 실제 카드 그리드와 같은 메이슨리 모양으로(높이 섞인 카드 블록)
// 채워, 전환이 "같은 그리드가 채워지는" 느낌이 되게 한다. 비율을 섞어 메이슨리 packing 을 흉내.
const SKELETON_RATIOS = [
  "aspect-[4/5]",
  "aspect-[4/3]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-[4/5]",
  "aspect-[4/3]",
];
export function DiscoveryGridSkeleton({ count = 6 }: { count?: number }) {
  // 로딩 플레이스홀더는 마운트 후에만 뜨므로(SSR 짜부라짐 무관) 반응형 CSS columns 로 간단히 그린다 —
  // 균일한 회색 블록이라 실제 그리드의 balance-gap 문제도 여기선 무해하다.
  return (
    <div role="status" aria-busy="true" className="columns-1 gap-4 sm:columns-2 sm:gap-5 lg:columns-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="mb-4 break-inside-avoid sm:mb-5">
          <div
            className={`w-full animate-pulse rounded-card-lg bg-slate-200/80 dark:bg-slate-800 ${SKELETON_RATIOS[i % SKELETON_RATIOS.length]}`}
          />
        </div>
      ))}
    </div>
  );
}
