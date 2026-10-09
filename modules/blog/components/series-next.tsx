import { ArrowRight, Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { authorHref } from "@/modules/blog/lib/author-href";
import { seriesItemHref, seriesItemKey, type SeriesNavView } from "@/modules/blog/lib/series-items";
import { cn } from "@/lib/utils";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { SeriesIndex } from "@/modules/blog/components/series-index";
import { SeriesNoteMarker } from "@/modules/blog/components/series-note-marker";

/**
 * End-of-post series continuation — the binge hook. After the body, a prominent "next part" card
 * (the natural for-you-just-finished moment that the top banner's small prev/next never owned) plus
 * a link back to the whole series. Renders when the post is in a series; if it's the last part, just
 * the "view all" link remains.
 */
export async function SeriesNext({
  series,
  username,
  locale,
  className,
}: {
  series: SeriesNavView;
  username: string;
  locale: string;
  className?: string;
}) {
  const t = await getTranslations("publicPost");
  const tf = await getTranslations("publicFeed");
  const next = series.next;
  return (
    <aside className={cn("mt-16 border-t border-slate-100 pt-8 dark:border-slate-800", className)}>
      {next && (
        <BlogLink
          href={seriesItemHref(username, next, locale)}
          className="mark-hoverable focus-ring group block rounded-surface border border-slate-200 p-5 transition-colors hover:border-accent-300 dark:border-slate-700 dark:hover:border-accent-500/50"
          data-bhv="series"
          data-bhv-id={`${username}/${seriesItemKey(next)}`}
          data-series-next=""
        >
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-accent-700 dark:text-accent-400">
            <Layers aria-hidden className="h-3 w-3" />
            {t("seriesNextUp")}
          </span>
          <span className="mt-2 flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <SeriesIndex n={series.position + 1} className="text-[12px]" />
                {next.type === "NOTE" && <SeriesNoteMarker label={tf("seriesNoteMarker")} />}
              </span>
              {next.type === "NOTE" ? (
                <span className="mt-1 line-clamp-3 block text-[15px] leading-relaxed text-slate-600 transition-colors group-hover:text-accent-700 dark:text-slate-300 dark:group-hover:text-accent-400">
                  {next.title}
                </span>
              ) : (
                <span className="mt-0.5 block text-[17px] font-semibold leading-snug text-slate-900 transition-colors group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
                  {next.title}
                </span>
              )}
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 transition-colors group-hover:text-accent-600 dark:text-slate-600" />
          </span>
        </BlogLink>
      )}
      <BlogLink
        href={authorHref(username, locale, `series/${series.slug}`)}
        className={`focus-ring inline-block rounded text-[13px] text-slate-500 underline-offset-4 transition-colors hover:text-accent-700 hover:underline dark:text-slate-400 dark:hover:text-accent-400 ${
          next ? "mt-3" : ""
        }`}
        data-bhv="series"
        data-bhv-id={series.slug}
      >
        {t("seriesViewAll", { total: series.total })}
      </BlogLink>
    </aside>
  );
}
