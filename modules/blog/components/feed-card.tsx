import type { ReactNode } from "react";
import { Heart } from "lucide-react";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";
import { showLikes, showViews } from "@/modules/blog/lib/public-metrics";

const DATE_LOCALE: Record<string, string> = { ko: "ko-KR", ja: "ja-JP", en: "en-US" };
const KURL_HOST = process.env.NEXT_PUBLIC_KURL_HOST;

/** prod → author subdomain; dev/preview → /p path on the same app. */
export function postHref(username: string, slug: string, locale: string): string {
  return KURL_HOST
    ? `https://${username}.${KURL_HOST}/${slug}`
    : `/${locale}/p/${username}/${slug}`;
}

/** Author's home (post list). prod → author subdomain root; dev/preview → /p/{username}. */
export function authorHref(username: string, locale: string): string {
  return KURL_HOST ? `https://${username}.${KURL_HOST}/` : `/${locale}/p/${username}`;
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
  // Single coverless treatment everywhere (featured + grid): the typographic cover.
  return <TypoCover item={item} />;
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
 * Meta row: author (its own link) on the left, then date. `compact` (grid cards) stops there to
 * keep the feed calm; the full row (featured) also shows views + the like count pushed right. Lives
 * outside the post anchor so the author link doesn't nest inside it.
 */
function MetaRow({
  item,
  locale,
  labels,
  compact = false,
}: {
  item: PublicFeedItem;
  locale: string;
  labels: Labels;
  compact?: boolean;
}) {
  return (
    <div className="mt-3 flex items-center gap-2 text-[12px] text-slate-500">
      <a
        href={authorHref(item.author.username, locale)}
        className="flex min-w-0 items-center gap-1.5 text-slate-500 transition-colors hover:text-slate-900"
      >
        <Avatar author={item.author} />
        <span className="truncate font-medium">{item.author.username}</span>
      </a>
      <span aria-hidden>·</span>
      <time dateTime={item.publishedAt} className="shrink-0">
        {formatDate(item.publishedAt, locale)}
      </time>
      {!compact && (
        <span className="ml-auto flex shrink-0 items-center gap-3">
          {showViews(item.viewCount) && <span>{labels.views(item.viewCount)}</span>}
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

/**
 * Typographic cover for image-less posts (Brunch-style) — the title set large on a quiet neutral
 * surface, filling the same 1.6:1 slot a photo would. It uses the real title (never a meaningless
 * placeholder), so every card keeps an identical cover box and the grid stays uniform-height. Kept
 * deliberately NEUTRAL (no brand-green wash, no mark): with ~1/3 of cards coverless, a green fill
 * would turn the accent into wallpaper. Accent stays reserved for the single tag eyebrow + hover.
 */
function TypoCover({ item }: { item: PublicFeedItem }) {
  return (
    <div className="flex h-full w-full flex-col justify-end gap-2 bg-gradient-to-br from-slate-50 to-slate-100/80 p-5">
      {item.tags[0] && <TagEyebrow tag={item.tags[0]} />}
      <h3 className="line-clamp-3 text-[17px] font-bold leading-snug tracking-tight text-slate-800 transition-colors group-hover:text-accent-700">
        {item.title}
      </h3>
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
}: {
  item: PublicFeedItem;
  locale: string;
  labels: Labels;
  /** Extra classes on the card `<li>` — e.g. a fixed width when used in a horizontal scroll row. */
  className?: string;
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
      {/* Mobile: compact row */}
      <div className="flex gap-3 p-3 sm:hidden">
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
          <MetaRow item={item} locale={locale} labels={labels} compact />
        </div>
      </div>

      {/* sm+: full card */}
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
              <TypoCover item={item} />
            )}
          </div>
        </a>
        <div className="flex flex-1 flex-col p-4">
          <a href={postUrl} className="flex flex-1 flex-col">
            {hasImage ? (
              <>
                {item.tags[0] && <TagEyebrow tag={item.tags[0]} />}
                <h2 className="mt-1 line-clamp-2 text-[17px] font-bold leading-[1.35] tracking-tight text-slate-900 transition-colors group-hover:text-accent-700">
                  {item.title}
                </h2>
                {item.excerpt && (
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-500">
                    {item.excerpt}
                  </p>
                )}
              </>
            ) : (
              item.excerpt && (
                <p className="line-clamp-2 text-[13px] leading-relaxed text-slate-500">
                  {item.excerpt}
                </p>
              )
            )}
          </a>
          <MetaRow item={item} locale={locale} labels={labels} compact />
        </div>
      </div>
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
        <div className="aspect-[1.6/1] w-full sm:aspect-auto sm:h-full">
          <Cover item={item} />
        </div>
      </a>
      <div className="flex flex-col justify-center p-6 sm:p-8">
        <a href={postUrl} className="flex flex-col">
          {/* "추천 · tag" eyebrow — one accent moment (추천 in green, tag muted) marking the hero. */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
            {featuredLabel && <span className="text-accent-700">{featuredLabel}</span>}
            {featuredLabel && item.tags[0] && <span className="text-slate-300" aria-hidden>·</span>}
            {item.tags[0] && <span className="text-slate-400">{item.tags[0]}</span>}
          </div>
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
