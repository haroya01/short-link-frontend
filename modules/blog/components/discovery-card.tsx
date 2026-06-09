/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { Heart, Eye } from "lucide-react";
import { useTranslations } from "next-intl";
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
// 카드 #태그는 항상 작동하는 "최신+태그" 그리드로 — 팔로잉/시리즈 탭에선 ?tag= 만으론 필터가 안 먹어
// 죽은 클릭이 되므로 sort=recent 로 못박는다(인기 주제 칩은 별도로 ?sort=trending&tag= 사용).
const tagHref = (tag: string) => `?sort=recent&tag=${encodeURIComponent(tag)}`;

// Theme covers for image-less posts — single-accent(emerald) + slate family only, so a grid of them
// stays on-brand (no rainbow) and dark enough that white text passes contrast. Indexed by post id.
const COVER_GRADS = [
  "from-emerald-500 via-teal-600 to-emerald-800",
  "from-teal-600 via-emerald-700 to-slate-900",
  "from-emerald-600 via-emerald-800 to-slate-900",
  "from-slate-700 via-emerald-800 to-slate-950",
  "from-teal-500 via-emerald-700 to-emerald-900",
  "from-slate-600 via-slate-800 to-slate-950",
];

function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 18" aria-hidden className={className} fill="currentColor">
      <rect x="6" y="1" width="20" height="3.4" rx="1.7" />
      <rect x="0" y="7.3" width="28" height="3.4" rx="1.7" />
      <rect x="9" y="13.6" width="17" height="3.4" rx="1.7" />
    </svg>
  );
}

function TagLink({ tag, over }: { tag: string; over?: boolean }) {
  return (
    <BlogLink
      href={tagHref(tag)}
      className={`pointer-events-auto rounded text-[12px] font-medium transition hover:underline ${
        over ? "text-white/85 hover:text-white" : "text-slate-400 hover:text-accent-600 dark:text-slate-500"
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

// 카드 공통 surface/motion 토큰 — 시스템과 통일: rounded-2xl, --ease, hover lift 0.5 + 그림자 상승,
// 300ms. focus-within ring = 전면 링크 카드의 키보드 포커스 가시화(WCAG 2.4.7).
const SHELL =
  "group relative overflow-hidden rounded-2xl transition-[transform,box-shadow] duration-300 ease-[var(--ease)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18)] focus-within:ring-2 focus-within:ring-accent-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-950";
const CARD_SHADOW = "shadow-[0_1px_3px_rgba(15,23,42,0.06)]";

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
  // 이미지 없는 글도 흰 텍스트 카드 대신 브랜드 그라데이션 "자동 표지"로 — 그리드가 전부 표지 룩으로 통일된다
  // (강제 스톡 이미지가 아니라 우리 UI: 그라데이션 + 3-bar 마크 + 제목, AGENTS §10.4 와 일관). 소개글이
  // 있으면 표지 위에 함께 얹어 글 카드의 정보(소개글)도 잃지 않는다.
  const showExcerpt = !hasImage && Boolean(item.excerpt);

  // ── cover / auto: 사진 또는 테마색 자동표지 ──
  const grad = COVER_GRADS[item.id % COVER_GRADS.length];
  // 이미지 없는 카드는 제목+소개글이 들어가도록 살짝 더 세로로(4/5). 사진 카드는 사진 비율 우선.
  const ratio = hasImage ? (featured ? "aspect-[3/4]" : "aspect-[4/3]") : featured ? "aspect-[4/5]" : "aspect-[4/5]";

  return (
    <div className={`${SHELL} ${CARD_SHADOW} bg-slate-200 dark:bg-slate-800`}>
      <div className={ratio}>
        {hasImage ? (
          <img
            src={item.ogImageUrl as string}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-[var(--ease)] group-hover:scale-[1.03] motion-reduce:transform-none"
          />
        ) : (
          <>
            <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
            <div className="absolute inset-0 bg-[radial-gradient(130%_110%_at_15%_0%,rgba(255,255,255,0.22),transparent_55%)]" />
          </>
        )}
        {/* 텍스트 가독성 scrim — 상·하단 모두(상단 태그, 하단 제목/메타). WCAG 대비 확보용으로 통일. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent" />
      </div>

      <div className="absolute right-3 top-3 z-20 text-white">
        <FeedCardBookmark postId={item.id} username={item.author.username} slug={item.slug} />
      </div>
      <BlogLink href={postUrl} aria-label={item.title} className="absolute inset-0 z-10" />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4">
        <div className="flex flex-wrap items-center gap-2">
          {tag && <TagLink tag={tag} over />}
          {!hasImage && <Mark className="h-3.5 w-auto text-white/85" />}
          {reason && <ReasonPill reason={reason} over t={t} />}
        </div>
        <div className="space-y-2">
          {/* 제목 스케일은 변형(이미지 유무)이 아니라 중요도(featured) 한 축으로만 — 위계 역전 방지. */}
          <h3 className={`text-balance font-semibold leading-tight tracking-tight text-white ${showExcerpt ? "line-clamp-2" : "line-clamp-3"} ${featured ? "text-[20px]" : "text-[18px]"}`}>
            {item.title}
          </h3>
          {showExcerpt && (
            <p className="line-clamp-2 text-[13px] leading-relaxed text-white/80">{item.excerpt}</p>
          )}
          <CardMeta item={item} locale={locale} over />
        </div>
      </div>
    </div>
  );
}

// Row-order grid (was CSS columns/masonry). columns 는 칼럼 우선(세로)으로 흘러 시각·DOM 순서가 어긋났는데
// (최신순인데 4번째 글이 2번째 칼럼 맨 위로), grid 는 행 우선이라 왼→오·위→아래 = 본문 순서와 일치.
// items-start: 카드가 자기 높이를 유지하고 행 위쪽 정렬(가장 큰 카드에 맞춰 늘어나지 않음).
export function DiscoveryGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 items-start gap-4 sm:gap-5 md:grid-cols-3">{children}</div>;
}

/** A child cell of {@link DiscoveryGrid}. Grid gap handles spacing — no masonry break rules needed. */
export function DiscoveryCell({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
