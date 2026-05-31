import type { ReactNode } from "react";
import { Heart } from "lucide-react";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";
import { showLikes } from "@/modules/blog/lib/public-metrics";

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

/** Kept for call-site compatibility; the weblog card no longer surfaces a view count. */
type Labels = { views: (count: number) => string };

function formatDate(iso: string, locale: string): string {
  // A weblog reads by recency, so the year is usually noise — "5월 30일" / "May 30". The full date
  // (with year) lives on the post page itself.
  return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    month: "long",
    day: "numeric",
  });
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
 * Representative tag = the post's first tag (the author orders them, so tag[0] is their pick). Shown
 * as a quiet muted label — NOT a coloured "category" badge. We have flat tags, not categories, so
 * dressing one up as a category would be a lie; this just hints at the post's subject.
 */
function TagEyebrow({ tag }: { tag: string }) {
  return <span className="text-[12px] font-medium text-slate-400">{tag}</span>;
}

/**
 * Meta line: author + date first (who, when — the weblog basics), with the like count demoted to a
 * faint marker on the right and only when there is one. Views are intentionally absent from the card.
 * Lives outside the post anchor so the author link isn't an `<a>` nested in an `<a>`.
 */
function MetaRow({
  item,
  locale,
  hideAuthor = false,
}: {
  item: PublicFeedItem;
  locale: string;
  hideAuthor?: boolean;
}) {
  return (
    <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-500">
      {!hideAuthor && (
        <>
          <a
            href={authorHref(item.author.username, locale)}
            className="flex min-w-0 items-center gap-1.5 transition-colors hover:text-slate-900"
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
      {/* Likes sit inline right after the date — same position on every card, never floated to a
          column edge that shifts with the thumbnail. Demoted: a faint marker, only shown when > 0. */}
      {showLikes(item.likeCount) && (
        <>
          <span aria-hidden>·</span>
          <span className="flex shrink-0 items-center gap-1">
            <Heart className="h-3 w-3" />
            {item.likeCount}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * Single-column post list — the home recent feed, the following tab, tag pages and the author profile
 * all wrap their {@link FeedCard}s in this. A quiet weblog reads as a vertical list, not a multi-column
 * card grid, so this is a narrow stacked column; the card's own bottom border draws the row dividers.
 */
export function FeedList({ children }: { children: ReactNode }) {
  return <ul className="flex max-w-2xl flex-col">{children}</ul>;
}

/**
 * Feed card. Two shapes for two contexts:
 * - **list row (default)**: a typography-led row — muted tag, title, excerpt, author·date — with an
 *   optional small thumbnail on the right. Image-less posts are a complete typographic row (no
 *   placeholder). `featured` gives the lead post a slightly larger title + an editorial label.
 * - **compact (`compact`)**: a small fixed-width vertical card for horizontal carousels (trending).
 * MetaRow stays a sibling of the post link (never nested) so the author link isn't an `<a>` in an `<a>`.
 */
export function FeedCard({
  item,
  locale,
  className,
  hideAuthor = false,
  featured = false,
  featuredLabel,
  compact = false,
}: {
  item: PublicFeedItem;
  locale: string;
  /** Unused by the weblog card; accepted so existing call sites compile. */
  labels?: Labels;
  /** Extra classes on the card `<li>` — e.g. a fixed width in a horizontal carousel. */
  className?: string;
  /** Drop the author from the meta — for single-author surfaces (the author profile page). */
  hideAuthor?: boolean;
  /** Lead post of the feed: slightly larger title + an editorial label above it. */
  featured?: boolean;
  /** Editorial label for the featured row (e.g. "오늘의 글" / "Today"). */
  featuredLabel?: string;
  /** Small fixed-width vertical card for horizontal carousels. */
  compact?: boolean;
}) {
  const postUrl = postHref(item.author.username, item.slug, locale);
  const hasImage = Boolean(item.ogImageUrl);

  if (compact) {
    return (
      <li
        className={
          "group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70 transition duration-200 hover:ring-slate-300 hover:shadow-card-hover focus-within:ring-2 focus-within:ring-accent-500" +
          (className ? ` ${className}` : "")
        }
      >
        {hasImage && (
          <a
            href={postUrl}
            aria-hidden
            tabIndex={-1}
            className="block aspect-[1.8/1] w-full overflow-hidden bg-slate-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.ogImageUrl as string}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transform-none"
            />
          </a>
        )}
        <div className="flex flex-1 flex-col p-4">
          <a href={postUrl} className="block">
            {item.tags[0] && <TagEyebrow tag={item.tags[0]} />}
            <h3 className="mt-0.5 line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-accent-700">
              {item.title}
            </h3>
          </a>
          <div className="mt-auto pt-2">
            <MetaRow item={item} locale={locale} hideAuthor={hideAuthor} />
          </div>
        </div>
      </li>
    );
  }

  return (
    <li
      className={
        "group relative border-b border-slate-100 last:border-b-0" +
        (className ? ` ${className}` : "")
      }
    >
      {/* -mx/px lets the hover highlight breathe past the text without moving the content edge (it
          stays aligned with the divider + header). A quiet affordance that the whole row is a link. */}
      <div
        className={`-mx-3 flex gap-4 rounded-xl px-3 py-5 transition-colors group-hover:bg-slate-50/70 sm:gap-6 ${
          featured ? "sm:py-7" : ""
        }`}
      >
        <div className="min-w-0 flex-1">
          <a href={postUrl} className="block">
            {/* One marker per row. The featured lead shows a quiet editorial label; every other row
                shows its muted representative tag. Never both — stacking them reads as a confusing
                "which one is the category?" pair. */}
            {featured && featuredLabel ? (
              <span className="text-[11px] font-semibold tracking-wide text-accent-600">
                {featuredLabel}
              </span>
            ) : (
              item.tags[0] && <TagEyebrow tag={item.tags[0]} />
            )}
            <h2
              className={`mt-0.5 line-clamp-2 font-bold leading-[1.3] tracking-tight text-slate-900 transition-colors group-hover:text-accent-700 ${
                featured ? "text-[22px] sm:text-[26px] sm:leading-[1.2]" : "text-[18px]"
              }`}
            >
              {item.title}
            </h2>
            {item.excerpt && (
              <p
                className={`mt-1.5 text-[14px] leading-relaxed text-slate-500 ${
                  featured ? "line-clamp-2 sm:line-clamp-3" : "line-clamp-2"
                }`}
              >
                {item.excerpt}
              </p>
            )}
          </a>
          <MetaRow item={item} locale={locale} hideAuthor={hideAuthor} />
        </div>

        {hasImage && (
          <a
            href={postUrl}
            aria-hidden
            tabIndex={-1}
            className={`block shrink-0 overflow-hidden rounded-xl bg-slate-100 ${
              featured ? "h-24 w-24 sm:h-28 sm:w-[150px]" : "h-20 w-20 sm:h-24 sm:w-32"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.ogImageUrl as string}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transform-none"
            />
          </a>
        )}
      </div>
    </li>
  );
}
