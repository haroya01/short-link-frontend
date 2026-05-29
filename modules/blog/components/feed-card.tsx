import type { ReactNode } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";

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
        {hasImage && (
          <div className="aspect-[1.6/1] w-full overflow-hidden bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.ogImageUrl as string}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
          </div>
        )}
        <div className="flex flex-1 flex-col px-4 pb-3 pt-4">
          <h2 className="line-clamp-2 text-[16px] font-bold leading-snug tracking-tight text-slate-900">
            {item.title}
          </h2>
          {item.excerpt && (
            <p
              className={cn(
                "mt-2 text-[13.5px] leading-relaxed text-slate-500",
                hasImage ? "line-clamp-2" : "line-clamp-4",
              )}
            >
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
            <span aria-hidden>·</span>
            <span>{labels.views(item.viewCount)}</span>
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
        <span className="flex shrink-0 items-center gap-1 text-[13px] text-slate-400">
          <Heart className="h-3.5 w-3.5" />
          {item.likeCount}
        </span>
      </div>
    </li>
  );
}
