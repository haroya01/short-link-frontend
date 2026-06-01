import { ArrowLeft, ArrowRight, Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { blogHref } from "@/lib/host";
import type { PublicPostSeriesNav } from "@/modules/blog/api/public-posts";
import { authorHref, postHref } from "@/modules/blog/components/feed-card";

/**
 * Tags at the foot of a post — rendered as quiet `#tag` text links, not pills. In the reading
 * surface typography wins over boxes (the chips belong to the discovery feed, not the article), so a
 * post's tags read like a hashtag line. Tag pages live on the blog host, posts on the author
 * subdomain, so each is a cross-host link to the global topic feed.
 */
export function TagChips({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {tags.map((tag) => (
        <li key={tag}>
          <a
            href={blogHref(`/tags/${encodeURIComponent(tag)}`)}
            className="focus-ring rounded text-[14px] text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400"
          >
            #{tag}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** velog-style series banner shown on a post that belongs to a series. */
export async function SeriesNav({
  series,
  username,
  locale,
}: {
  series: PublicPostSeriesNav;
  username: string;
  locale: string;
}) {
  const t = await getTranslations("publicPost");
  // A quiet left-rule section instead of a filled rounded card — in the reading column the series
  // context is a margin note, not a boxed widget (and the old fill had no dark variant, reading as a
  // washed light slab in dark mode).
  return (
    <nav className="mb-10 border-l-2 border-accent-500 pl-4">
      <a
        href={authorHref(username, locale, `series/${series.slug}`)}
        className="group flex items-center gap-2 rounded transition-colors focus-ring"
      >
        <Layers className="h-4 w-4 text-accent-600 dark:text-accent-400" />
        <span className="text-[15px] font-semibold text-slate-900 group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
          {series.title}
        </span>
        <span className="text-[13px] text-slate-500 dark:text-slate-400">
          {t("seriesPosition", { position: series.position, total: series.total })}
        </span>
      </a>
      <div className="mt-3 flex items-stretch justify-between gap-3 text-[13px]">
        {series.prev ? (
          <a
            href={postHref(username, series.prev.slug, locale)}
            className="group flex min-w-0 flex-1 items-center gap-2 rounded text-slate-500 transition-colors hover:text-accent-700 focus-ring dark:text-slate-400 dark:hover:text-accent-400"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">{series.prev.title}</span>
          </a>
        ) : (
          <span className="flex-1" />
        )}
        {series.next ? (
          <a
            href={postHref(username, series.next.slug, locale)}
            className="group flex min-w-0 flex-1 items-center justify-end gap-2 rounded text-right text-slate-500 transition-colors hover:text-accent-700 focus-ring dark:text-slate-400 dark:hover:text-accent-400"
          >
            <span className="truncate">{series.next.title}</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </a>
        ) : (
          <span className="flex-1" />
        )}
      </div>
    </nav>
  );
}
