import { getTranslations } from "next-intl/server";
import { blogHref } from "@/lib/host";
import type { SuggestedAuthor, TagCount } from "@/modules/blog/api/public-posts";
import { authorHref } from "@/modules/blog/components/feed-card";
import { TagChip } from "@/modules/blog/components/tag-chip";

/**
 * The discovery rail's mobile counterpart. The desktop {@link DiscoveryRail} is a sidebar (lg+), so
 * on phones — where this product mostly lives — popular tags and suggested authors would otherwise
 * vanish entirely. This lays the same data out as horizontally-scrolling strips above the feed, and
 * hides itself on lg+ where the sidebar takes over. Mirrors the rail's empty-section handling.
 */
export async function MobileDiscoveryStrip({
  locale,
  tags,
  authors,
}: {
  locale: string;
  tags: TagCount[];
  authors: SuggestedAuthor[];
}) {
  const t = await getTranslations({ locale, namespace: "publicFeed" });

  if (tags.length === 0 && authors.length === 0) return null;

  return (
    <div className="lg:hidden">
      {tags.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-[12px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("railPopularTags")}
            </h2>
            <a
              href={blogHref("/tags")}
              className="rounded text-[12px] font-medium text-accent-600 transition-colors hover:text-accent-700 focus-ring"
            >
              {t("railSeeAll")}
            </a>
          </div>
          <div className="relative -mx-4">
            <ul className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tags.map((tag) => (
                <li key={tag.tag} className="shrink-0">
                  <TagChip
                    href={blogHref(`/tags/${encodeURIComponent(tag.tag)}`)}
                    label={tag.tag}
                    count={tag.count}
                  />
                </li>
              ))}
            </ul>
            {/* Right-edge fade — signals the row scrolls (mobile has no scrollbar). */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent dark:from-slate-950" />
          </div>
        </section>
      )}

      {authors.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("railSuggestedAuthors")}
          </h2>
          <div className="relative -mx-4">
            <ul className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {authors.map(({ author, postCount }) => (
              <li key={author.username} className="shrink-0">
                <a
                  href={authorHref(author.username, locale)}
                  className="flex w-44 items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-ring dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
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
                    <span className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                      {author.username}
                    </span>
                    <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {t("railPostCount", { count: postCount })}
                    </span>
                  </span>
                </a>
              </li>
            ))}
            </ul>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent dark:from-slate-950" />
          </div>
        </section>
      )}
    </div>
  );
}
