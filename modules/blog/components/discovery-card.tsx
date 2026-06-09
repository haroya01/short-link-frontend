/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { Heart, Eye } from "lucide-react";
import { DATE_LOCALE } from "@/lib/date";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";
import { showLikes, showViews } from "@/modules/blog/lib/public-metrics";
import { postHref, authorHref } from "@/modules/blog/components/feed-card";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { FeedCardBookmark } from "@/modules/blog/components/feed-card-bookmark";

/**
 * Discovery feed card — the *browse* surface (blog home 최신 / 검색), as opposed to the *reading*
 * surfaces (post / author / tags) which keep the AGENTS.md §10.1 single-column list. Every post is a
 * visual tile so the masonry reads uniformly: a post with an OG image gets a full-bleed cover; a post
 * without one gets a generated theme-color cover (the 3-bar mark = kurl signature) — so we never force
 * authors to upload an image, yet the grid is never patchy.
 *
 * Carries exactly the same info as {@link FeedCard}: representative tag · author · date · likes (>0) ·
 * views (≥10, per public-metrics) · save toggle. Only the layout differs.
 */

const fmtNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

function fmtDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", { month: "long", day: "numeric" });
}

// Deterministic theme cover for image-less posts — index by post id so it never changes between renders.
const COVER_GRADS = [
  "from-emerald-500 to-teal-700",
  "from-sky-500 to-indigo-700",
  "from-rose-500 to-fuchsia-700",
  "from-violet-500 to-indigo-700",
  "from-amber-400 to-orange-600",
  "from-slate-600 to-slate-900",
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

function CardMeta({ item, locale }: { item: PublicFeedItem; locale: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-white/85">
      <BlogLink
        href={authorHref(item.author.username, locale)}
        className="flex min-w-0 items-center gap-1.5 transition-opacity hover:opacity-80"
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
          <Heart className="ml-0.5 h-3 w-3" />
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

/**
 * @param featured Lead post of the recent feed — a taller cover so the "오늘의 글" emphasis carries
 *   visual weight without breaking the masonry (CSS columns can't span, so weight = height, not width).
 */
export function DiscoveryCard({
  item,
  locale,
  featured = false,
}: {
  item: PublicFeedItem;
  locale: string;
  featured?: boolean;
}) {
  const postUrl = postHref(item.author.username, item.slug, locale);
  const hasImage = Boolean(item.ogImageUrl);
  const tag = item.tags[0];
  const ratio = hasImage ? (featured ? "aspect-[3/4]" : "aspect-[4/3]") : featured ? "aspect-[4/5]" : "aspect-square";
  const grad = COVER_GRADS[item.id % COVER_GRADS.length];

  return (
    <div className="group relative overflow-hidden rounded-[22px] bg-slate-200 shadow-[0_8px_30px_rgba(15,23,42,0.10)] transition-transform duration-300 hover:-translate-y-1 dark:bg-slate-800">
      <div className={ratio}>
        {hasImage ? (
          <>
            <img
              src={item.ogImageUrl as string}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transform-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          </>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
        )}
      </div>

      {/* Save toggle — sibling of the post link (never nested in an <a>); top-right on every card. */}
      <div className="absolute right-3 top-3 z-20 text-white">
        <FeedCardBookmark postId={item.id} username={item.author.username} slug={item.slug} />
      </div>

      {/* The whole tile is a link to the post; meta/author links sit above it (z-20). */}
      <BlogLink href={postUrl} aria-label={item.title} className="absolute inset-0 z-10" />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4">
        <div className="flex items-center gap-2">
          {tag && <span className="text-[12px] font-medium text-white/85">#{tag}</span>}
          {!hasImage && <Mark className="h-3.5 w-auto text-white/80" />}
        </div>
        <div className="pointer-events-auto space-y-2">
          <h3
            className={`text-balance font-semibold leading-tight tracking-tight text-white ${
              hasImage ? "text-[18px]" : "text-[20px] font-bold leading-[1.13]"
            }`}
          >
            {item.title}
          </h3>
          <CardMeta item={item} locale={locale} />
        </div>
      </div>
    </div>
  );
}

/** Masonry wrapper — JS-free CSS columns. Mobile 2-col → up to 4-col on wide screens. */
export function DiscoveryGrid({ children }: { children: ReactNode }) {
  return <div className="gap-4 columns-2 md:columns-3 xl:columns-4 sm:gap-5">{children}</div>;
}

/** A child cell of {@link DiscoveryGrid} — keeps a card (or interleaved block) from splitting across columns. */
export function DiscoveryCell({ children }: { children: ReactNode }) {
  return <div className="mb-4 break-inside-avoid sm:mb-5">{children}</div>;
}
