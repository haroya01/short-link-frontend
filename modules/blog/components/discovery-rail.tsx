import { getTranslations } from "next-intl/server";
import { blogHref } from "@/lib/host";
import type { SuggestedAuthor, TagCount } from "@/modules/blog/api/public-posts";
import { authorHref } from "@/modules/blog/components/feed-card";

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
    <div className="flex flex-col gap-8">
      {tags.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-500">
              {t("railPopularTags")}
            </h2>
            <a
              href={blogHref("/tags")}
              className="text-[12px] font-medium text-accent-600 hover:text-accent-700"
            >
              {t("railSeeAll")}
            </a>
          </div>
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag.tag}>
                <a
                  href={blogHref(`/tags/${encodeURIComponent(tag.tag)}`)}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[13px] font-medium text-slate-600 transition-colors hover:bg-accent-50 hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-1"
                >
                  <span>{tag.tag}</span>
                  <span className="text-slate-500">{tag.count}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {authors.length > 0 && (
        <section>
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-500">
            {t("railSuggestedAuthors")}
          </h2>
          <ul className="flex flex-col gap-1">
            {authors.map(({ author, postCount }) => (
              <li key={author.username}>
                <a
                  href={authorHref(author.username, locale)}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-1"
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
                    <span className="truncate text-[14px] font-semibold text-slate-800 group-hover:text-slate-900">
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
    </div>
  );
}
