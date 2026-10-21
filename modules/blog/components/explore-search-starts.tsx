"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { blogHref, blogPath } from "@/lib/host";
import { cn } from "@/lib/utils";
import { listPopularTags } from "@/modules/blog/api/public-posts";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { TagChip } from "@/modules/blog/components/tag-chip";
import { rememberSearch, useRecentSearches } from "@/modules/blog/lib/recent-searches";
import { listTrendingNoteTags } from "@/modules/notes/api/notes";
import { noteTagHref } from "@/modules/notes/components/note-body";

const searchHref = (q: string) => blogHref(`/?q=${encodeURIComponent(q)}`);

function useStartTags() {
  const noteTags = useQuery({
    queryKey: ["explore", "note-tags"],
    queryFn: () => listTrendingNoteTags().then((found) => found.slice(0, 5).map((trend) => trend.tag)),
    staleTime: 5 * 60_000,
  });
  const postTags = useQuery({
    queryKey: ["explore", "popular-tags"],
    queryFn: () => listPopularTags(12).then((found) => (found.ok ? found.data.map((tag) => tag.tag) : [])),
    staleTime: 5 * 60_000,
  });
  const notes = noteTags.data ?? [];
  const taken = new Set(notes.map((tag) => tag.toLowerCase()));
  const posts = (postTags.data ?? []).filter((tag) => !taken.has(tag.toLowerCase()));
  return [
    ...notes.map((tag) => ({ tag, href: noteTagHref(tag) })),
    ...posts.map((tag) => ({ tag, href: blogPath(`/tags/${encodeURIComponent(tag)}`) })),
  ];
}

export function ExploreSearchStarts({ open }: { open: boolean }) {
  const t = useTranslations("publicFeed");
  const recents = useRecentSearches();
  const tags = useStartTags();
  const panel = useRef<HTMLDivElement>(null);
  const empty = recents.list.length === 0 && tags.length === 0;

  useEffect(() => {
    if (panel.current) panel.current.inert = !open;
  }, [open]);

  return (
    <div
      ref={panel}
      data-testid="explore-search-starts"
      data-open={open && !empty ? "true" : undefined}
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        "grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-[var(--ease)] motion-reduce:transition-none",
        open && !empty ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="-mx-4 min-h-0 overflow-hidden px-4 sm:-mx-6 sm:px-6">
        {recents.list.length > 0 && (
          <section aria-labelledby="recent-searches" data-testid="recent-searches" className="pt-5">
            <div className="flex items-center justify-between gap-3">
              <RailHeading id="recent-searches">{t("recentSearches")}</RailHeading>
              <button
                type="button"
                onClick={recents.clear}
                aria-label={t("recentSearchesClear")}
                className="focus-ring touch-target rounded text-[13px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {t("recentSearchesClearShort")}
              </button>
            </div>
            <ul className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
              {recents.list.map((recent) => (
                <li
                  key={recent}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-[13px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  <BlogLink
                    href={searchHref(recent)}
                    onClick={() => rememberSearch(recent)}
                    className="focus-ring max-w-[12rem] truncate rounded py-0.5 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    {recent}
                  </BlogLink>
                  <button
                    type="button"
                    onClick={() => recents.forget(recent)}
                    aria-label={t("recentSearchRemove", { query: recent })}
                    className="focus-ring grid h-6 w-6 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  >
                    <X aria-hidden strokeWidth={2.5} className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {tags.length > 0 && (
          <ul
            data-testid="explore-tag-chips"
            aria-label={t("railPopularTags")}
            className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {tags.map(({ tag, href }) => (
              <li key={href} className="shrink-0">
                <TagChip href={href} label={`#${tag}`} soft />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
