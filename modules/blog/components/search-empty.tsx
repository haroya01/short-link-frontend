import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { blogPath } from "@/lib/host";
import type { TagCount } from "@/modules/blog/api/public-posts";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { TagChip } from "@/modules/blog/components/tag-chip";

/**
 * The inline form is phone-only: phones have no header search field, and it works without JS.
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
    <BlogEmpty icon={Search} title={t("searchNoPosts")}>
      <form action="" method="get" className="mt-6 w-full max-w-sm sm:hidden">
        <input
          type="search"
          name="q"
          defaultValue={query}
          enterKeyHint="search"
          aria-label={t("searchPlaceholder")}
          placeholder={t("searchPlaceholder")}
          className="focus-ring h-10 w-full rounded-full border border-slate-200 bg-white px-4 text-[14px] text-slate-900 placeholder:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
        />
      </form>

      {topics.length > 0 && (
        <div className="mt-10 w-full max-w-md">
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{t("searchEmptyTopics")}</p>
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
    </BlogEmpty>
  );
}
