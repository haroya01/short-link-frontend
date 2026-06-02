import { getTranslations } from "next-intl/server";
import { Mark } from "@/components/common/logo";
import { blogPath } from "@/lib/host";
import type { TagCount } from "@/modules/blog/api/public-posts";
import { TagChip } from "@/modules/blog/components/tag-chip";

/**
 * No-results state for a feed search — built as a *discovery springboard*, not a dead end. Instead of a
 * generic icon-medallion + "try again", it echoes what was searched, then hands the reader popular
 * topics to jump into (one tap → that tag's feed). The kurl mark line-draws in (the 사사삭) as the quiet
 * brand signature in place of a stock search glyph. Fully dark-aware.
 */
export async function SearchEmpty({
  query,
  tags,
  locale,
}: {
  query: string;
  tags: TagCount[];
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  const topics = tags.slice(0, 8);

  return (
    <div className="flex flex-col items-center px-4 py-20 text-center sm:py-28">
      <Mark className="h-6 w-auto text-accent-600 dark:text-accent-400" animated />

      <h2 className="mt-7 max-w-md text-[22px] font-bold leading-snug tracking-tight text-slate-900 dark:text-slate-100">
        {t("searchEmptyHeading", { q: query })}
      </h2>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
        {t("searchEmptyBody")}
      </p>

      {topics.length > 0 && (
        <div className="mt-10 w-full max-w-md">
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
            {t("searchEmptyTopics")}
          </p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {topics.map((tag) => (
              <li key={tag.tag}>
                <TagChip
                  soft
                  href={blogPath(`/tags/${encodeURIComponent(tag.tag)}`)}
                  label={tag.tag}
                  count={tag.count}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
