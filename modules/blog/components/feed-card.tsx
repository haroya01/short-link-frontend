import { DATE_LOCALE } from "@/lib/date";
import type { ReactNode } from "react";
import { Heart } from "lucide-react";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";
import { showLikes } from "@/modules/blog/lib/public-metrics";
import { Avatar as AuthorAvatar } from "@/modules/blog/components/avatar";
import { FeedCardBookmark } from "@/modules/blog/components/feed-card-bookmark";
import { BlogLink } from "@/modules/blog/components/blog-link";

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

function formatDate(iso: string, locale: string): string {
  // A weblog reads by recency, so the year is usually noise — "5월 30일" / "May 30". The full date
  // (with year) lives on the post page itself.
  return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    month: "long",
    day: "numeric",
  });
}

function Avatar({ author }: { author: PublicFeedItem["author"] }) {
  return <AuthorAvatar src={author.avatarUrl} name={author.username} size="xs" />;
}

/**
 * Representative tag = the post's first tag (the author orders them, so tag[0] is their pick). Shown
 * as a quiet muted label — NOT a coloured "category" badge. We have flat tags, not categories, so
 * dressing one up as a category would be a lie; this just hints at the post's subject.
 */
function TagEyebrow({ tag }: { tag: string }) {
  return <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500">{tag}</span>;
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
    <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
      {!hideAuthor && (
        <>
          <BlogLink
            href={authorHref(item.author.username, locale)}
            className="flex min-w-0 items-center gap-1.5 transition-colors hover:text-slate-900 dark:hover:text-slate-100"
          >
            <Avatar author={item.author} />
            <span className="truncate font-medium">{item.author.username}</span>
          </BlogLink>
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
            <Heart className="h-3 w-3 text-accent-500" />
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

/** Loading placeholder shaped like a {@link FeedCard} list row — used while a client feed (following,
 *  search) fetches, so the transition reads as the same list filling in, not a blank gap. */
export function FeedListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul role="status" aria-busy className="flex max-w-2xl animate-pulse flex-col">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
          <div className="flex gap-4 py-5 sm:gap-6">
            <div className="min-w-0 flex-1 space-y-2.5 py-0.5">
              <div className="h-3 w-14 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-4 w-4/5 rounded bg-slate-200/80 dark:bg-slate-700/80" />
              <div className="h-3.5 w-full rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-3 w-28 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-20 w-20 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 sm:h-24 sm:w-32" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Feed card — a typography-led list row: muted tag, title, excerpt, author·date, with an optional
 * small thumbnail on the right. Image-less posts are a complete typographic row (no placeholder).
 * `featured` gives the lead post a slightly larger title + an editorial label. MetaRow stays a sibling
 * of the post link (never nested) so the author link isn't an `<a>` nested in an `<a>`.
 */
export function FeedCard({
  item,
  locale,
  className,
  hideAuthor = false,
  featured = false,
  featuredLabel,
  flushTop = false,
  showBookmark = true,
}: {
  item: PublicFeedItem;
  locale: string;
  /** Extra classes on the card `<li>`. */
  className?: string;
  /** Drop the author from the meta — for single-author surfaces (the author profile page). */
  hideAuthor?: boolean;
  /** Lead post of the feed: slightly larger title + an editorial label above it. */
  featured?: boolean;
  /** Editorial label for the featured row (e.g. "오늘의 글" / "Today"). */
  featuredLabel?: string;
  /** First row of a feed with no featured lead: trim the top padding so it sits flush under the tabs
   *  (aligned with the rail) instead of floating below an empty band. */
  flushTop?: boolean;
  /** Show the save-to-reading-list toggle in the card's top-right (needs a numeric post id). */
  showBookmark?: boolean;
}) {
  const postUrl = postHref(item.author.username, item.slug, locale);
  const hasImage = Boolean(item.ogImageUrl);
  const bookmarkable = showBookmark && typeof item.id === "number";

  return (
    <li
      className={
        "group relative border-b border-slate-100 last:border-b-0 dark:border-slate-800" +
        (className ? ` ${className}` : "")
      }
    >
      {/* -mx/px lets the hover highlight breathe past the text without moving the content edge (it
          stays aligned with the divider + header). A quiet affordance that the whole row is a link. */}
      <div
        className={`-mx-3 flex gap-4 rounded-xl px-3 transition-colors group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40 sm:gap-6 ${
          // A row flush to the top of the feed (the featured lead, or the first row of a lead-less feed)
          // gets only a hair of top padding — any more reads as an empty band under the tabs and pushes
          // the content below the rail. Featured keeps a generous bottom so its larger title has weight.
          featured || flushTop ? "pt-1.5 sm:pt-2" : "pt-5"
        } ${featured ? "pb-6 sm:pb-8" : "pb-5"}`}
      >
        <div className="min-w-0 flex-1">
          {/* Text-only rows reserve a right gutter so the title never runs under the bookmark (pinned
              to the whole card's top-right below); image rows don't need it — the button sits over the
              thumbnail, clear of the narrower text column. */}
          <BlogLink href={postUrl} className={`block ${bookmarkable && !hasImage ? "pr-9" : ""}`}>
            {/* One marker per row. The featured lead shows a quiet editorial label (with a small
                brand-green dot so it reads as the chosen post); every other row shows its muted
                representative tag. Never both — stacking them reads as a confusing category pair. */}
            {featured && featuredLabel ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-accent-600">
                <span aria-hidden className="h-1 w-1 rounded-full bg-accent-500" />
                {featuredLabel}
              </span>
            ) : (
              item.tags[0] && <TagEyebrow tag={item.tags[0]} />
            )}
            <h2
              className={`mt-1 line-clamp-2 font-bold leading-[1.3] text-slate-900 transition-colors group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400 ${
                featured
                  ? "text-[23px] tracking-headline sm:text-[27px] sm:leading-[1.18]"
                  : "text-[18px] tracking-tight"
              }`}
            >
              {item.title}
            </h2>
            {item.excerpt && (
              <p
                className={`mt-1.5 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400 ${
                  featured ? "line-clamp-2 sm:line-clamp-3" : "line-clamp-2"
                }`}
              >
                {item.excerpt}
              </p>
            )}
          </BlogLink>
          <MetaRow item={item} locale={locale} hideAuthor={hideAuthor} />
        </div>

        {hasImage && (
          <BlogLink
            href={postUrl}
            aria-hidden
            tabIndex={-1}
            className={`block shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 ${
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
          </BlogLink>
        )}
      </div>

      {bookmarkable && (
        // Pinned to the whole card's top-right so it's in the same spot on every row regardless of
        // whether the row has a thumbnail. Sibling of the post links (never nested in an <a>).
        <div className="absolute right-3 top-4 z-10">
          <FeedCardBookmark postId={item.id} username={item.author.username} slug={item.slug} />
        </div>
      )}
    </li>
  );
}
