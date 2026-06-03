"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Mark } from "@/components/common/logo";
import { authorHref, postHref } from "@/modules/blog/components/feed-card";
import type { PublicPostSeriesNav } from "@/modules/blog/api/public-posts";

type Episode = { slug: string; title: string };

/**
 * On-post series banner (top of a series article). Quiet left-rule in the reading column — series
 * title + a progress stepper ("you are on part 2 of 3") + a collapsible full episode list with the
 * current post highlighted, so the reader feels the whole arc without leaving the page.
 */
export function SeriesNav({
  series,
  episodes,
  currentSlug,
  username,
  locale,
}: {
  series: PublicPostSeriesNav;
  episodes: Episode[];
  currentSlug: string;
  username: string;
  locale: string;
}) {
  const t = useTranslations("publicPost");
  const [open, setOpen] = useState(false);
  const seriesHref = authorHref(username, locale, `series/${series.slug}`);

  return (
    <nav className="mb-10 border-l-2 border-accent-500 pl-4">
      <div className="flex items-center justify-between gap-3">
        <a href={seriesHref} className="focus-ring group flex min-w-0 items-center gap-2 rounded">
          <Mark className="h-3 w-auto shrink-0 text-accent-600 dark:text-accent-400" />
          <span className="truncate text-[15px] font-semibold text-slate-900 transition-colors group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
            {series.title}
          </span>
        </a>
        <span className="shrink-0 font-mono text-[12px] tabular-nums text-slate-500 dark:text-slate-400">
          {t("seriesPosition", { position: series.position, total: series.total })}
        </span>
      </div>

      {/* Progress stepper — filled up to and including the current part. */}
      <div className="mt-2 flex items-center gap-1" aria-hidden>
        {Array.from({ length: series.total }).map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < series.position ? "bg-accent-500" : "bg-slate-200 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>

      {episodes.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="focus-ring mt-2 inline-flex items-center gap-1 rounded text-[13px] font-medium text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400"
          >
            {t("seriesInThis")}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <ol className="mt-2 space-y-0.5">
              {episodes.map((ep, i) => {
                const current = ep.slug === currentSlug;
                const ep1 = (
                  <span className="mt-px shrink-0 font-mono text-[11px] tabular-nums opacity-70">
                    {t("seriesEpisode", { n: i + 1 })}
                  </span>
                );
                return (
                  <li key={ep.slug}>
                    {current ? (
                      <span
                        aria-current="true"
                        className="flex items-start gap-2 rounded px-1 py-0.5 text-[13px] font-semibold text-accent-700 dark:text-accent-400"
                      >
                        {ep1}
                        <span>{ep.title}</span>
                      </span>
                    ) : (
                      <a
                        href={postHref(username, ep.slug, locale)}
                        className="focus-ring flex items-start gap-2 rounded px-1 py-0.5 text-[13px] text-slate-600 transition-colors hover:text-accent-700 dark:text-slate-300 dark:hover:text-accent-400"
                      >
                        {ep1}
                        <span>{ep.title}</span>
                      </a>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </nav>
  );
}
