import { getTranslations } from "next-intl/server";
import { blogHref } from "@/lib/host";
import type { SuggestedAuthor, TagCount } from "@/modules/blog/api/public-posts";
import { authorHref } from "@/modules/blog/components/feed-card";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { TagChip } from "@/modules/blog/components/tag-chip";

/**
 * Desktop discovery rail beside the feed — popular tags + suggested authors. Each section hides
 * itself when empty so a young, sparse platform doesn't render a skeleton of headers over nothing;
 * the page drops the whole rail (and its grid column) when both are empty.
 */
export async function DiscoveryRail({
  locale,
  tags,
  authors,
}: {
  locale: string;
  tags: TagCount[];
  authors: SuggestedAuthor[];
}) {
  const t = await getTranslations({ locale, namespace: "publicFeed" });

  return (
    <div className="flex flex-col gap-6">
      {authors.length > 0 && (
        <section>
          <RailHeading className="mb-3">{t("railWriters")}</RailHeading>
          <ul className="flex flex-col gap-1">
            {authors.map(({ author, postCount }) => (
              <li key={author.username}>
                <a
                  href={authorHref(author.username, locale)}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 focus-ring dark:hover:bg-slate-800/50"
                >
                  {author.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={author.avatarUrl}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-100 text-[13px] font-semibold text-accent-700">
                      {author.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[14px] font-semibold text-slate-800 group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-slate-100">
                      {author.username}
                    </span>
                    <span className="truncate text-[12px] text-slate-500">
                      {t("railPostCount", { count: postCount })}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tags.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <RailHeading>{t("railTopics")}</RailHeading>
            <a
              href={blogHref("/tags")}
              className="rounded text-[12px] font-medium text-accent-600 transition-colors hover:text-accent-700 focus-ring"
            >
              {t("railSeeAll")}
            </a>
          </div>
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag.tag}>
                <TagChip
                  href={blogHref(`/tags/${encodeURIComponent(tag.tag)}`)}
                  label={tag.tag}
                  count={tag.count}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
