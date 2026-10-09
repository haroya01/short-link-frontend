import { Rss } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { PublicPostListItem, PublicSeriesListItem } from "@/modules/blog/api/public-posts";
import { authorHref } from "@/modules/blog/lib/author-href";
import { contentLang } from "@/modules/blog/lib/content-lang";
import { seriesItemCount } from "@/modules/blog/lib/series-items";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { RailTagList } from "@/modules/blog/components/rail-tag-list";
import { isDisplayableTag } from "@/modules/blog/lib/tag-normalize";

const MAX_TAGS = 12;

/**
 * The author page's right rail — their series and the tags they write under, both author-scoped
 * (a tag narrows this author's posts). The dated archive lives in the main column (PostLedger).
 */
export async function AuthorRail({
  username,
  locale,
  posts,
  series,
  activeTag,
}: {
  username: string;
  locale: string;
  posts: PublicPostListItem[];
  series: PublicSeriesListItem[];
  /** When set, the matching tag chip inverts to the brand fill and links back to the unfiltered
   *  author home (so it reads as a removable filter, not a link off to the global topic feed). */
  activeTag?: string;
}) {
  const t = await getTranslations("publicPost");
  const tf = await getTranslations("publicFeed");
  const authorHome = authorHref(username, locale);
  // Tags scope to THIS author's posts (?tag=) — clicking one filters the author's own writing, not
  // the cross-author topic feed at /tags/{tag}. The active chip links back home to clear the filter.
  const tagHref = (tag: string) =>
    tag === activeTag ? authorHome : `${authorHome}?tag=${encodeURIComponent(tag)}`;

  const tagCounts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      if (!isDisplayableTag(tag)) continue; // skip junk tags (incomplete jamo, single-char, mash)
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const tags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_TAGS);

  return (
    <div className="flex flex-col gap-6">
      {series.length > 0 && (
        <section>
          <RailHeading className="mb-3">{t("tabSeries")}</RailHeading>
          <ul className="flex flex-col gap-1">
            {series.map((s) => (
              <li key={s.slug}>
                <BlogLink
                  href={authorHref(username, locale, `series/${s.slug}`)}
                  className="group flex items-baseline justify-between gap-3 rounded-surface px-2 py-2 transition-colors hover:bg-slate-50 focus-ring dark:hover:bg-slate-800/50"
                >
                  <span
                    lang={contentLang(s.title)}
                    className="truncate text-[14px] font-medium text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100"
                  >
                    {s.title}
                  </span>
                  <span className="shrink-0 text-[12px] text-slate-500 dark:text-slate-400">
                    {tf("seriesItemCount", { count: seriesItemCount(s) })}
                  </span>
                </BlogLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tags.length > 0 && (
        <section>
          <RailHeading className="mb-3">{t("railTags")}</RailHeading>
          <RailTagList tags={tags} hrefFor={tagHref} activeTag={activeTag} />
        </section>
      )}

      <a
        href={authorHref(username, locale, "feed")}
        className="focus-ring inline-flex w-fit items-center gap-1.5 rounded text-[12px] font-medium text-slate-500 dark:text-slate-400 transition-colors hover:text-accent-700"
      >
        <Rss className="h-3.5 w-3.5" />
        RSS
      </a>
    </div>
  );
}
