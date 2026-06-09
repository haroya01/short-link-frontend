"use client";

import { useTranslations } from "next-intl";
import { blogPath } from "@/lib/host";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { useTagPrefs } from "@/modules/blog/lib/use-tag-prefs";

/**
 * The reader's followed tags — a quiet "jump to my topics" strip above the feed. Renders nothing
 * until they follow at least one. Grid-aligned (max-w-4xl) and uses the system topic-pill language
 * (same as 인기 탭 주제 칩 / 팔로잉 필터 칩) so it reads as part of the feed, not a boxy banner — the
 * old star + bold heading felt heavy and broke the grid's width. Each pill opens that topic's feed.
 */
export function MyTagsStrip() {
  const t = useTranslations("publicFeed");
  const { prefs } = useTagPrefs();
  if (prefs.followed.length === 0) return null;

  return (
    <section className="mx-auto mt-4 w-full max-w-4xl">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-0.5 text-[12px] font-medium text-slate-400 dark:text-slate-500">
          {t("myTags")}
        </span>
        {prefs.followed.map((tag) => (
          <BlogLink
            key={tag}
            href={blogPath(`/tags/${encodeURIComponent(tag)}`)}
            className="rounded-full bg-slate-100 px-3 py-1 text-[13px] font-medium text-slate-600 transition-colors duration-200 ease-[var(--ease)] hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          >
            #{tag}
          </BlogLink>
        ))}
      </div>
    </section>
  );
}
