"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { blogPath } from "@/lib/host";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { listTrendingNoteLinks, type TrendingNoteLink } from "@/modules/notes/api/notes";
import { SparkBars } from "./trending-note-tags";

export function linkHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function linkedNotesHref(url: string): string {
  return blogPath(`/notes/link?url=${encodeURIComponent(url)}`);
}

export function TrendingNoteLinks() {
  const t = useTranslations("notes");
  const [links, setLinks] = useState<TrendingNoteLink[]>([]);

  useEffect(() => {
    let alive = true;
    listTrendingNoteLinks()
      .then((found) => alive && setLinks(found.slice(0, 5)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (links.length === 0) return null;
  return (
    <section aria-labelledby="trending-note-links" data-testid="trending-note-links" className="mt-8">
      <h2 id="trending-note-links" className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
        {t("trendingLinksTitle")}
      </h2>
      <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
        {links.map((trend) => {
          const host = linkHost(trend.url);
          return (
            <li key={trend.url}>
              <BlogLink
                href={linkedNotesHref(trend.url)}
                className="focus-ring -mx-2 flex items-center justify-between gap-3 rounded-surface px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <span className="min-w-0">
                  {trend.title && (
                    <span className="block truncate text-[12px] text-slate-500 dark:text-slate-400">{host}</span>
                  )}
                  <span className="line-clamp-2 text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                    {trend.title || host}
                  </span>
                  <span className="block text-[12px] text-slate-500 dark:text-slate-400">
                    {t("trendingLinksAccounts", { count: trend.accounts })}
                  </span>
                </span>
                <SparkBars history={trend.history} />
              </BlogLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
