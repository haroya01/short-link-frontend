"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { listTrendingNoteTags, type TrendingNoteTag } from "@/modules/notes/api/notes";
import { noteTagHref } from "./note-body";

/** Beside the notes feed on wide screens, as on Mastodon's web: hashtags several accounts used this
 *  week, each with a bar per day. Nothing shows until there is something trending. */
export function TrendingNoteTags() {
  const t = useTranslations("notes");
  const [tags, setTags] = useState<TrendingNoteTag[]>([]);

  useEffect(() => {
    let alive = true;
    listTrendingNoteTags()
      .then((found) => alive && setTags(found.slice(0, 5)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (tags.length === 0) return null;
  return (
    <section aria-labelledby="trending-note-tags" data-testid="trending-note-tags">
      <h2 id="trending-note-tags" className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
        {t("trendingTagsTitle")}
      </h2>
      <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
        {tags.map((trend) => (
          <li key={trend.tag}>
            <BlogLink
              href={noteTagHref(trend.tag)}
              className="focus-ring -mx-2 flex items-center justify-between gap-3 rounded-surface px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                  #{trend.tag}
                </span>
                <span className="block text-[12px] text-slate-500 dark:text-slate-400">
                  {t("trendingTagsAccounts", { count: trend.accounts })}
                </span>
              </span>
              <SparkBars history={trend.history} />
            </BlogLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SparkBars({ history }: { history: number[] }) {
  const peak = Math.max(1, ...history);
  return (
    <span className="flex h-[22px] shrink-0 items-end gap-[3px]" aria-hidden>
      {history.map((count, i) => (
        <span
          key={i}
          className={count === 0 ? "w-1 rounded-full bg-slate-200 dark:bg-slate-700" : "w-1 rounded-full bg-accent-600"}
          style={{ height: `${Math.max(3, (22 * count) / peak)}px` }}
        />
      ))}
    </span>
  );
}
