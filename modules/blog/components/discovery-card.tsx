/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { Heart, Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link as TransitionLink } from "next-view-transitions";
import { blogPath } from "@/lib/host";
import { DATE_LOCALE } from "@/lib/date";
import type { FollowReason, PublicFeedItem } from "@/modules/blog/api/public-posts";
import { showLikes, showViews } from "@/modules/blog/lib/public-metrics";
import { postHref, authorHref } from "@/modules/blog/components/feed-card";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { FeedCardBookmark } from "@/modules/blog/components/feed-card-bookmark";

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

const fmtNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);
function fmtDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", { month: "long", day: "numeric" });
}
// 카드 #태그 = 주제의 정식 목적지인 /tags/[tag] 읽기 페이지. 이전엔 ?sort=recent&tag= 그리드
// 필터였는데, 같은 #태그 affordance 가 화면에 따라 세 목적지(recent 필터·trending 필터·읽기
// 페이지)로 갈라져 있었다. 규칙을 하나로: #태그 텍스트는 어디서든 /tags/[tag], in-place 필터는
// active 상태를 가진 칩 스트립(TrendingTopics)만. 팔로잉/시리즈 탭에서 ?tag= 가 안 먹어 sort 를
// 못박던 핵도 함께 사라진다.
const tagHref = (tag: string) => blogPath(`/tags/${encodeURIComponent(tag)}`);

function TagLink({ tag, over }: { tag: string; over?: boolean }) {
  return (
    <BlogLink
      href={tagHref(tag)}
      className={`pointer-events-auto rounded text-[12px] font-medium transition hover:underline ${
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
        className="pointer-events-auto flex min-w-0 items-center gap-1.5 transition-opacity hover:opacity-80"
      >
        <Avatar src={item.author.avatarUrl} name={item.author.username} size="xs" />
        <span className="truncate font-medium">{item.author.username}</span>
      </BlogLink>
      <span aria-hidden>·</span>
      <time dateTime={item.publishedAt} className="shrink-0">
        {fmtDate(item.publishedAt, locale)}
      </time>
      {showLikes(item.likeCount) && (
        <span className="flex shrink-0 items-center gap-0.5">
          <Heart className={`ml-0.5 h-3 w-3 ${over ? "" : "text-accent-500"}`} />
          {item.likeCount}
        </span>
      )}
      {showViews(item.viewCount) && (
        <span className="flex shrink-0 items-center gap-0.5">
          <Eye className="ml-0.5 h-3 w-3" />
          {fmtNum(item.viewCount)}
        </span>
      )}
    </div>
  );
}

// 카드 공통 surface/motion 토큰 — rounded-2xl, --ease, 300ms. 입체감: 다층 그림자(닿는 면 가까운 1px +
// 퍼지는 ambient)로 평면이 아니라 살짝 떠 있게, hover 시 -translate-y-1 로 깊게 떠오르며 그림자 확장.
// focus-within ring = 전면 링크 카드의 키보드 포커스 가시화(WCAG 2.4.7).
const SHELL =
  "group relative overflow-hidden rounded-2xl transition-[transform,box-shadow] duration-300 ease-[var(--ease)] hover:-translate-y-1 hover:shadow-card-hover has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-600 has-[:focus-visible]:ring-offset-2 dark:has-[:focus-visible]:ring-offset-slate-950";
const CARD_SHADOW =
  "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_-8px_rgba(15,23,42,0.12)]";

export function DiscoveryCard({
  item,
  locale,
  featured = false,
}: {
  item: PublicFeedItem;
  locale: string;
  featured?: boolean;
}) {
  const t = useTranslations("publicFeed");
  const postUrl = postHref(item.author.username, item.slug, locale);
  const hasImage = Boolean(item.ogImageUrl);
  const tag = item.tags[0];
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
            {tag && <TagLink tag={tag} />}
            {reason && <ReasonPill reason={reason} t={t} />}
          </div>
          <h3 className={`text-balance font-semibold leading-snug tracking-tight text-slate-900 dark:text-slate-100 ${featured ? "text-[19px]" : "text-[17px]"}`}>
            {item.title}
          </h3>
          {item.excerpt && (
            <p className="line-clamp-4 text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
              {item.excerpt}
            </p>
          )}
          <CardMeta item={item} locale={locale} />
        </div>
      </div>
    );
  }

  // ── cover: 사진이 카드 전체 배경 ──
  const ratio = featured ? "aspect-[3/4]" : "aspect-[4/3]";

  return (
    // ring-inset white/10: 어두운 커버 가장자리에 유리 같은 얇은 빛 테두리 → 입체감.
    <div className={`${SHELL} ${CARD_SHADOW} bg-slate-200 ring-1 ring-inset ring-white/10 dark:bg-slate-800`}>
      <div className={ratio}>
        <img
          src={item.ogImageUrl as string}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-[var(--ease)] group-hover:scale-[1.03] motion-reduce:transform-none"
        />
        {/* 텍스트 가독성 scrim — 상·하단 모두(상단 태그, 하단 제목/메타). WCAG 대비 확보용으로 통일. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent" />
        {/* 위에서 빛이 닿는 1px 하이라이트 — 커버가 평면 아니라 살짝 솟은 듯한 입체감. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
      </div>

      <div className="absolute right-3 top-3 z-20 text-white">
        <FeedCardBookmark postId={item.id} username={item.author.username} slug={item.slug} />
      </div>
      <PostLink href={postUrl} aria-label={item.title} className="absolute inset-0 z-10" />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4">
        <div className="flex flex-wrap items-center gap-2">
          {tag && <TagLink tag={tag} over />}
          {reason && <ReasonPill reason={reason} over t={t} />}
        </div>
        <div className="space-y-2">
          {/* 제목 스케일은 변형(이미지 유무)이 아니라 중요도(featured) 한 축으로만 — 위계 역전 방지. */}
          <h3 className={`line-clamp-3 text-balance font-semibold leading-tight tracking-tight text-white ${featured ? "text-[20px]" : "text-[18px]"}`}>
            {item.title}
          </h3>
          <CardMeta item={item} locale={locale} over />
        </div>
      </div>
    </div>
  );
}

// 메이슨리(JS-free CSS columns) — 카드를 크기대로 빈틈없이 퍼즐처럼 채운다(행 강제 정렬 X). 모바일 2열
// → md 3열. 행순서 그리드는 밑 여백이 들쭉날쭉해 메이슨리의 타이트한 packing 을 선택(시각 우선).
export function DiscoveryGrid({ children }: { children: ReactNode }) {
  return <div className="gap-4 columns-2 sm:gap-5 md:columns-3">{children}</div>;
}

/** A child cell of {@link DiscoveryGrid} — 칼럼 사이에서 카드가 쪼개지지 않게 막는다.
 *  `entranceDelay` 가 오면 마운트 시 짧은 스태거 페이드(fill backwards — 딜레이 동안 안 보이게).
 *  무한스크롤 append 가 "뚝" 나타나는 걸 지우는 용도 — 이미 마운트된 카드는 다시 돌지 않고,
 *  reduced-motion 은 globals 의 animate-fade-in 가드가 통째로 끈다. */
export function DiscoveryCell({ children, entranceDelay }: { children: ReactNode; entranceDelay?: number }) {
  return (
    <div
      className={`mb-4 break-inside-avoid sm:mb-5 ${entranceDelay != null ? "animate-fade-in" : ""}`}
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
  return (
    <div role="status" aria-busy="true" className="gap-4 columns-2 sm:gap-5 md:columns-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="mb-4 break-inside-avoid sm:mb-5">
          <div
            className={`w-full animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800 ${SKELETON_RATIOS[i % SKELETON_RATIOS.length]}`}
          />
        </div>
      ))}
    </div>
  );
}
