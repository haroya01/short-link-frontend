import { Heart } from "lucide-react";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";

const DATE_LOCALE: Record<string, string> = { ko: "ko-KR", ja: "ja-JP", en: "en-US" };
const KURL_HOST = process.env.NEXT_PUBLIC_KURL_HOST;

/** prod → author subdomain; dev/preview → /p path on the same app. */
export function postHref(username: string, slug: string, locale: string): string {
  return KURL_HOST
    ? `https://${username}.${KURL_HOST}/${slug}`
    : `/${locale}/p/${username}/${slug}`;
}

type Labels = { views: (count: number) => string };

/**
 * A post card for the public feed and tag pages. The body links to the post; tags are separate
 * links to /tags/{tag} (kept outside the post anchor — no nested <a>).
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
  return (
    <li className="-mx-4 rounded-2xl px-4 py-5 transition-colors hover:bg-slate-50">
      <a href={postHref(item.author.username, item.slug, locale)} className="group flex items-start gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[13px] text-slate-500">
            {item.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.author.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-100 text-[10px] font-semibold text-accent-700">
                {item.author.username.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate">@{item.author.username}</span>
          </div>
          <h2 className="mt-1.5 text-[19px] font-semibold leading-snug tracking-tight text-slate-900 group-hover:text-accent-700">
            {item.title}
          </h2>
          {item.excerpt && (
            <p className="mt-1.5 line-clamp-2 text-[15px] leading-relaxed text-slate-500">
              {item.excerpt}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px] text-slate-400">
            <time dateTime={item.publishedAt}>
              {new Date(item.publishedAt).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span>·</span>
            <span>{labels.views(item.viewCount)}</span>
            {item.likeCount > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Heart className="h-3 w-3" />
                {item.likeCount}
              </span>
            )}
          </div>
        </div>
        {item.ogImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.ogImageUrl}
            alt=""
            className="hidden h-20 w-28 shrink-0 rounded-xl object-cover sm:block"
            loading="lazy"
          />
        )}
      </a>
      {item.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.tags.slice(0, 4).map((tag) => (
            <a
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-medium text-slate-500 transition-colors hover:bg-accent-50 hover:text-accent-700"
            >
              {tag}
            </a>
          ))}
        </div>
      )}
    </li>
  );
}
