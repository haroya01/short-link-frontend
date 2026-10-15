import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { blogPath } from "@/lib/host";
import type { SuggestedAuthor, TagCount } from "@/modules/blog/api/public-posts";
import { RailAuthors } from "@/modules/blog/components/rail-authors";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { TagChip } from "@/modules/blog/components/tag-chip";
import { isDisplayableTag } from "@/modules/blog/lib/tag-normalize";

/**
 * Desktop discovery rail beside the feed — popular tags + suggested authors. Each section hides
 * itself when empty so a young, sparse platform doesn't render a skeleton of headers over nothing;
 * the page drops the whole rail (and its grid column) when both are empty.
 */
export async function DiscoveryRail({
  locale,
  tags,
  authors,
  authorLimit,
}: {
  locale: string;
  tags: TagCount[];
  authors: SuggestedAuthor[];
  /** How many authors the page asked for, so the signed-in reader's list asks for the same. */
  authorLimit: number;
}) {
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  // Junk tags (incomplete jamo, single-char, mash) never make the rail — its section hides when the
  // cleaned list is empty, same as the raw one did.
  const topics = tags.filter((tag) => isDisplayableTag(tag.tag));

  return (
    <div className="flex flex-col gap-6">
      {authors.length > 0 && <RailAuthors locale={locale} initial={authors} limit={authorLimit} />}

      {topics.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <RailHeading>{t("railTopics")}</RailHeading>
            <Link
              href={blogPath("/tags")}
              className="rounded text-[12px] font-medium text-accent-700 transition-colors hover:text-accent-800 focus-ring dark:text-accent-400 dark:hover:text-accent-300"
            >
              {t("railSeeAll")}
            </Link>
          </div>
          <ul className="flex flex-wrap gap-2">
            {topics.map((tag) => (
              <li key={tag.tag}>
                <TagChip
                  href={blogPath(`/tags/${encodeURIComponent(tag.tag)}`)}
                  label={tag.tag}
                  count={tag.count}
                  soft
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
