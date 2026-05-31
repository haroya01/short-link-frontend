import type { ReactNode } from "react";
import { Heart } from "lucide-react";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";
import { showLikes, showViews } from "@/modules/blog/lib/public-metrics";
import { Mark } from "@/components/common/logo";

const DATE_LOCALE: Record<string, string> = { ko: "ko-KR", ja: "ja-JP", en: "en-US" };
const KURL_HOST = process.env.NEXT_PUBLIC_KURL_HOST;

/** prod → author subdomain; dev/preview → /p path on the same app. */
export function postHref(username: string, slug: string, locale: string): string {
  return KURL_HOST
    ? `https://${username}.${KURL_HOST}/${slug}`
    : `/${locale}/p/${username}/${slug}`;
}

/**
 * Author's home (post list) or a sub-page. prod → author subdomain; dev/preview → /p/{username}.
 * Pass `subpath` ("series" / "about" / "{slug}") for author sub-pages so links resolve in BOTH the
 * subdomain and the path-based deployment — a bare "/series" breaks on kurl.me/{locale}/p/{user}.
 */
export function authorHref(username: string, locale: string, subpath = ""): string {
  const base = KURL_HOST ? `https://${username}.${KURL_HOST}` : `/${locale}/p/${username}`;
  if (!subpath) return KURL_HOST ? `${base}/` : base;
  return `${base}/${subpath.replace(/^\//, "")}`;
}

type Labels = { views: (count: number) => string };

function formatDate(iso: string, locale: string): string {
  // No year — on a recency feed the year is noise, and the full "2026년 5월 30일" crowded the meta
  // row on narrow grid cards (it wrapped / collided with views + likes). "5월 30일" / "May 30".
  return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    month: "long",
    day: "numeric",
  });
}

function Cover({ item }: { item: PublicFeedItem }) {
  if (item.ogImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.ogImageUrl}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transform-none"
      />
    );
  }
  // Single coverless treatment everywhere (featured + grid): a neutral branded placeholder.
  return <CoverPlaceholder />;
}

function Avatar({ author }: { author: PublicFeedItem["author"] }) {
  if (author.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={author.avatarUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
    );
  }
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-100 text-[10px] font-semibold text-accent-700">
      {author.username.charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * Meta row: author (its own link) + date, with the like count pushed right — shown on every card so
 * image and image-less cards read identically. `compact` (grid/row cards) hides views to stay calm;
 * the full row (featured) adds views. `hideAuthor` drops the author on a single-author surface (the
 * author profile page) where repeating it on every row is noise. Lives outside the post anchor so
 * the author link doesn't nest inside it.
 */
function MetaRow({
  item,
  locale,
  labels,
  compact = false,
  hideAuthor = false,
}: {
  item: PublicFeedItem;
  locale: string;
  labels: Labels;
  compact?: boolean;
  hideAuthor?: boolean;
}) {
  return (
    <div className="mt-3 flex items-center gap-2 text-[12px] text-slate-500">
      {!hideAuthor && (
        <>
          <a
            href={authorHref(item.author.username, locale)}
            className="flex min-w-0 items-center gap-1.5 text-slate-500 transition-colors hover:text-slate-900"
          >
            <Avatar author={item.author} />
            <span className="truncate font-medium">{item.author.username}</span>
          </a>
          <span aria-hidden>·</span>
        </>
      )}
      <time dateTime={item.publishedAt} className="shrink-0">
        {formatDate(item.publishedAt, locale)}
      </time>
      {(showLikes(item.likeCount) || (!compact && showViews(item.viewCount))) && (
        <span className="ml-auto flex shrink-0 items-center gap-3">
          {!compact && showViews(item.viewCount) && <span>{labels.views(item.viewCount)}</span>}
          {showLikes(item.likeCount) && (
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {item.likeCount}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function TagEyebrow({ tag }: { tag: string }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-accent-700">{tag}</span>
  );
}

/**
 * Shared responsive card grid: the home feed (FeedInfinite), the following tab, and tag pages all
 * wrap their {@link FeedCard}s in this so every grid matches. With a discovery rail the cards cap at
 * 3 columns (the rail eats the 4th); without one they go 4-up.
 */
export function FeedGrid({
  children,
  hasRail = false,
}: {
  children: ReactNode;
  hasRail?: boolean;
}) {
  return (
    <ul
      className={`grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 ${
        hasRail ? "xl:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4"
      }`}
    >
      {children}
    </ul>
  );
}

function CoverPlaceholder() {
  // Neutral branded placeholder for image-less posts. Keeps the card structurally identical to photo
  // cards (cover box + body), so the title/excerpt/meta line up across the grid. Not a blank void —
  // the kurl mark sits faintly centered.
  return (
    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-50 to-slate-100/80">
      <Mark className="h-5 w-auto text-slate-300" />
    </div>
  );
}

/**
 * Feed card with two layouts so the feed reads well at both sizes:
 * - **mobile (`<sm`)**: a compact row — small square thumbnail + tag/title/meta beside it. Dense and
 *   scannable, so the phone feed isn't an endless stack of tall blocks.
 * - **`sm`+**: the full card — a 1.6:1 cover (photo, or a typographic cover for image-less posts)
 *   over tag/title/excerpt. Identical card box keeps the grid even.
 * MetaRow stays a sibling of the post link (never nested) so the author link isn't an `<a>` in an `<a>`.
 */
export function FeedCard({
  item,
  locale,
  labels,
  className,
  row = false,
  hideAuthor = false,
}: {
  item: PublicFeedItem;
  locale: string;
  labels: Labels;
  /** Extra classes on the card `<li>` — e.g. a fixed width when used in a horizontal scroll row. */
  className?: string;
  /** Force the compact row layout at all widths (single-column lists, e.g. the author profile). */
  row?: boolean;
  /** Drop the author from the meta — for single-author surfaces (author profile page). */
  hideAuthor?: boolean;
}) {
  const postUrl = postHref(item.author.username, item.slug, locale);
  const hasImage = Boolean(item.ogImageUrl);
  return (
    <li
      className={
        "group overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70 transition duration-200 hover:ring-slate-300 hover:shadow-card-hover focus-within:ring-2 focus-within:ring-accent-500" +
        (className ? ` ${className}` : "")
      }
    >
      {/* Compact row — always when `row`, else mobile-only (`sm` gets the full card below). */}
      <div className={row ? "flex gap-3 p-3" : "flex gap-3 p-3 sm:hidden"}>
        <a
          href={postUrl}
          className="block h-[84px] w-[84px] shrink-0 overflow-hidden rounded-xl bg-slate-100"
          aria-hidden
          tabIndex={-1}
        >
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.ogImageUrl as string}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="block h-full w-full bg-gradient-to-br from-slate-100 to-slate-200/80" />
          )}
        </a>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <a href={postUrl} className="block">
            {item.tags[0] && <TagEyebrow tag={item.tags[0]} />}
            <h2 className="mt-0.5 line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-accent-700">
              {item.title}
            </h2>
          </a>
          <MetaRow item={item} locale={locale} labels={labels} compact hideAuthor={hideAuthor} />
        </div>
      </div>

      {/* sm+: full card (skipped in forced-row mode) */}
      {!row && (
      <div className="hidden flex-col sm:flex">
        <a href={postUrl} className="block">
          <div className="aspect-[1.6/1] w-full overflow-hidden bg-slate-100">
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.ogImageUrl as string}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transform-none"
              />
            ) : (
              <CoverPlaceholder />
            )}
          </div>
        </a>
        {/* Same body for photo + image-less cards, with reserved title/excerpt heights, so every
            card is the same height and the author·date·♥ meta lines up across the grid. */}
        <div className="flex flex-1 flex-col p-4">
          <a href={postUrl} className="flex flex-1 flex-col">
            {item.tags[0] && <TagEyebrow tag={item.tags[0]} />}
            <h2 className="mt-1 line-clamp-2 min-h-[2.7em] text-[17px] font-bold leading-[1.35] tracking-tight text-slate-900 transition-colors group-hover:text-accent-700">
              {item.title}
            </h2>
            <p className="mt-1.5 line-clamp-2 min-h-[2.6em] text-[13px] leading-relaxed text-slate-500">
              {item.excerpt}
            </p>
          </a>
          <MetaRow item={item} locale={locale} labels={labels} compact hideAuthor={hideAuthor} />
        </div>
      </div>
      )}
    </li>
  );
}

/**
 * Wide "featured" variant for the lead post of the feed. Cover and copy sit side by side on desktop
 * (stacked on mobile) with a larger title, giving the feed an editorial focal point before the
 * uniform grid below. Same anchor discipline as {@link FeedCard}.
 */
export function FeedFeaturedCard({
  item,
  locale,
  labels,
  featuredLabel,
}: {
  item: PublicFeedItem;
  locale: string;
  labels: Labels;
  featuredLabel?: string;
}) {
  const postUrl = postHref(item.author.username, item.slug, locale);
  return (
    <div className="group grid overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70 transition duration-200 hover:ring-slate-300 hover:shadow-card-hover focus-within:ring-2 focus-within:ring-accent-500 sm:grid-cols-2 sm:items-stretch">
      {/* Cover bleeds to the card edge — aspect-locked on mobile, full-height on desktop. */}
      <a href={postUrl} className="block overflow-hidden bg-slate-100">
        <div className="aspect-[2/1] w-full sm:aspect-auto sm:h-full">
          <Cover item={item} />
        </div>
      </a>
      <div className="flex flex-col justify-center p-6 sm:p-8">
        <a href={postUrl} className="flex flex-col">
          {/* Single curation marker only ("추천"/"Featured"). The tag is NOT shown here — 상품·개발·
              일상 are themes/tags, not top-level categories, so a "추천 · 개발" pair read as a category
              badge. The post's tags live on the post itself. */}
          {featuredLabel && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-accent-700">
              {featuredLabel}
            </span>
          )}
          <h2 className="mt-1.5 line-clamp-3 text-[24px] font-bold leading-[1.2] tracking-tight text-slate-900 transition-colors group-hover:text-accent-700 sm:text-[28px]">
            {item.title}
          </h2>
          {item.excerpt && (
            <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-slate-500">
              {item.excerpt}
            </p>
          )}
        </a>
        <MetaRow item={item} locale={locale} labels={labels} />
      </div>
    </div>
  );
}
