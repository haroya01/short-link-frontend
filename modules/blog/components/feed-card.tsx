import type { ReactNode } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
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

// Brand-green-only cover variants for posts without an og:image — keeps the grid balanced (every
// card gets a 1.6:1 cover) without introducing off-brand color. Direction + shade vary so a column
// of thumbnail-less posts doesn't read as one flat block.
const COVER_GRADIENTS = [
  "bg-gradient-to-br from-accent-50 to-accent-100",
  "bg-gradient-to-tr from-accent-100 to-accent-50",
  "bg-gradient-to-b from-accent-50 to-emerald-100",
  "bg-gradient-to-bl from-emerald-50 to-accent-100",
];

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Synthetic cover for posts without a thumbnail: a green-family gradient with a faint oversized "#"
 * watermark and the post's first tag (or a clamped title fallback), so the card matches the
 * dimensions of image cards instead of leaving a tall empty box.
 */
function CoverFallback({ title, tags, seed }: { title: string; tags: string[]; seed: string }) {
  const gradient = COVER_GRADIENTS[hashSeed(seed) % COVER_GRADIENTS.length];
  const label = tags[0];
  return (
    <div
      className={cn(
        "relative flex aspect-[1.6/1] w-full items-center justify-center overflow-hidden",
        gradient,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-7 -right-2 select-none text-[150px] font-black leading-none text-accent-600/10"
      >
        #
      </span>
      {label ? (
        <span className="relative max-w-full truncate px-6 text-[18px] font-bold tracking-tight text-accent-800/80">
          {label}
        </span>
      ) : (
        <span className="relative line-clamp-2 px-6 text-center text-[15px] font-bold leading-snug tracking-tight text-accent-800/70">
          {title}
        </span>
      )}
    </div>
  );
}

/**
 * velog-style responsive card grid. 1 / 2 / 3 / 4 columns. Both the feed home and tag pages wrap
 * their {@link FeedCard}s in this so the layout stays identical.
 */
export function FeedGrid({ children }: { children: ReactNode }) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </ul>
  );
}

/**
 * A velog-style post card: cover thumbnail on top, then title + excerpt, a date/views sub-line,
 * and a bottom author row with the like count. The card body links to the post; the author row is
 * a separate link to the author page (sibling anchors — no nesting).
 */
export function FeedCard({
  item,
  locale,
  labels,
}: {
  item: PublicFeedItem;
  locale: string;
  labels: Labels;
}) {
  const hasImage = Boolean(item.ogImageUrl);
  return (
    <li className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
      <a href={postHref(item.author.username, item.slug, locale)} className="flex flex-1 flex-col">
        {hasImage ? (
          <div className="aspect-[1.6/1] w-full overflow-hidden bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.ogImageUrl as string}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
          </div>
        ) : (
          <CoverFallback title={item.title} tags={item.tags} seed={item.slug} />
        )}
        <div className="flex flex-1 flex-col px-4 pb-3 pt-4">
          {hasImage && item.tags[0] && (
            <span className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent-600">
              {item.tags[0]}
            </span>
          )}
          <h2 className="line-clamp-2 text-[17px] font-bold leading-[1.3] tracking-tight text-slate-900">
            {item.title}
          </h2>
          {item.excerpt && (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-400">
              {item.excerpt}
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4 text-[12px] text-slate-400">
            <time dateTime={item.publishedAt}>
              {new Date(item.publishedAt).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            {showViews(item.viewCount) && (
              <>
                <span aria-hidden>·</span>
                <span>{labels.views(item.viewCount)}</span>
              </>
            )}
          </div>
        </div>
      </a>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
        <a
          href={authorHref(item.author.username, locale)}
          className="flex min-w-0 items-center gap-2 text-[13px] text-slate-500 transition-colors hover:text-slate-900"
        >
          {item.author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.author.avatarUrl}
              alt=""
              className="h-6 w-6 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-100 text-[11px] font-semibold text-accent-700">
              {item.author.username.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate">
            by <b className="font-semibold text-slate-700">{item.author.username}</b>
          </span>
        </a>
        {showLikes(item.likeCount) && (
          <span className="flex shrink-0 items-center gap-1 text-[13px] text-slate-400">
            <Heart className="h-3.5 w-3.5" />
            {item.likeCount}
          </span>
        )}
      </div>
    </li>
  );
}
