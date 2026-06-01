import { Rss } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { blogHref } from "@/lib/host";
import type { PublicPostListItem, PublicSeriesListItem } from "@/modules/blog/api/public-posts";
import { authorHref } from "@/modules/blog/components/feed-card";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { TagChip } from "@/modules/blog/components/tag-chip";

const DATE_LOCALE: Record<string, string> = { ko: "ko-KR", ja: "ja-JP", en: "en-US" };
const MAX_TAGS = 12;
const MAX_ARCHIVE = 8;

/**
 * The author page's right rail — the blog-native structure that makes an author's space feel like a
 * weblog rather than a flat post dump: their **series**, the **tags** they write under, and an
 * **archive** of how their writing has piled up over time. Series link to the series pages; tags link
 * to the topic feed; the archive is a quiet, non-interactive timeline (a sense of accumulation, the
 * thing a content feed loses). All author-scoped — the data that only makes sense here, not on the
 * cross-author home. Series come from the API; tags + archive are derived from the post list.
 */
export async function AuthorRail({
  username,
  locale,
  posts,
  series,
}: {
  username: string;
  locale: string;
  posts: PublicPostListItem[];
  series: PublicSeriesListItem[];
}) {
  const t = await getTranslations("publicPost");

  const tagCounts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const tags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_TAGS);

  const monthCounts = new Map<string, number>();
  for (const post of posts) {
    const d = new Date(post.publishedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  }
  const archive = [...monthCounts.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, MAX_ARCHIVE);
  const monthLabel = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
      year: "numeric",
      month: "long",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {series.length > 0 && (
        <section>
          <RailHeading className="mb-3">{t("tabSeries")}</RailHeading>
          <ul className="flex flex-col gap-1">
            {series.map((s) => (
              <li key={s.slug}>
                <a
                  href={authorHref(username, locale, `series/${s.slug}`)}
                  className="group flex items-baseline justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 focus-ring dark:hover:bg-slate-800/50"
                >
                  <span className="truncate text-[14px] font-medium text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100">
                    {s.title}
                  </span>
                  <span className="shrink-0 text-[12px] text-slate-400">
                    {t("railPostCount", { count: s.postCount })}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tags.length > 0 && (
        <section>
          <RailHeading className="mb-3">{t("railTags")}</RailHeading>
          <ul className="flex flex-wrap gap-2">
            {tags.map(([tag, count]) => (
              <li key={tag}>
                <TagChip
                  href={blogHref(`/tags/${encodeURIComponent(tag)}`)}
                  label={tag}
                  count={count}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {archive.length > 0 && (
        <section>
          <RailHeading className="mb-3">{t("railArchive")}</RailHeading>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {archive.map(([key, count]) => (
              <li key={key} className="flex items-baseline justify-between gap-3 px-2 text-slate-500">
                <span>{monthLabel(key)}</span>
                <span className="text-slate-400">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <a
        href={authorHref(username, locale, "feed")}
        className="focus-ring inline-flex w-fit items-center gap-1.5 rounded text-[12px] font-medium text-slate-400 transition-colors hover:text-accent-700"
      >
        <Rss className="h-3.5 w-3.5" />
        RSS
      </a>
    </div>
  );
}
