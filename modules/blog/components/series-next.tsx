import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Mark } from "@/components/common/logo";
import { authorHref, postHref } from "@/modules/blog/components/feed-card";
import type { PublicPostSeriesNav } from "@/modules/blog/api/public-posts";

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
}: {
  series: PublicPostSeriesNav;
  username: string;
  locale: string;
}) {
  const t = await getTranslations("publicPost");
  return (
    <aside className="mt-16 border-t border-slate-100 pt-8 dark:border-slate-800">
      {series.next && (
        <a
          href={postHref(username, series.next.slug, locale)}
          className="focus-ring group block rounded-2xl border border-slate-200 p-5 transition-colors hover:border-accent-300 dark:border-slate-700 dark:hover:border-accent-500/50"
        >
          <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-400">
            <Mark className="h-2.5 w-auto" />
            {t("seriesNextUp")}
          </span>
          <span className="mt-2 flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block font-mono text-[12px] tabular-nums text-slate-400 dark:text-slate-500">
                {t("seriesEpisode", { n: series.position + 1 })}
              </span>
              <span className="mt-0.5 block text-[17px] font-semibold leading-snug text-slate-900 transition-colors group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
                {series.next.title}
              </span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 transition-colors group-hover:text-accent-600 dark:text-slate-600" />
          </span>
        </a>
      )}
      <a
        href={authorHref(username, locale, `series/${series.slug}`)}
        className={`focus-ring inline-block rounded text-[13px] text-slate-500 underline-offset-4 transition-colors hover:text-accent-700 hover:underline dark:text-slate-400 dark:hover:text-accent-400 ${
          series.next ? "mt-3" : ""
        }`}
      >
        {t("seriesViewAll", { total: series.total })}
      </a>
    </aside>
  );
}
