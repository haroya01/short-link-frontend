import { getTranslations } from "next-intl/server";
import { Mark } from "@/components/common/logo";
import type { PublicSeriesCard } from "@/modules/blog/api/public-posts";
import { authorHref } from "@/modules/blog/components/feed-card";

const DATE_LOCALE: Record<string, string> = { ko: "ko-KR", ja: "ja-JP", en: "en-US" };

// Episode markers cap — past this the dots stop reading as a count and start as a bar.
const MAX_DOTS = 6;

/**
 * A series as a single "collection" unit in the feed flow — a bordered card (distinct from the flat
 * post rows) that surfaces a multi-post series for discovery. Links into the series detail page.
 * Server-rendered so the date/labels resolve with the request locale; it's handed to the client
 * {@link FeedInfinite} as a node and dropped in among the post rows.
 */
export async function SeriesFeedCard({
  series,
  locale,
}: {
  series: PublicSeriesCard;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  const date = new Date(series.lastPublishedAt).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    month: "long",
    day: "numeric",
  });
  const dots = Math.min(series.postCount, MAX_DOTS);

  return (
    <a
      href={authorHref(series.author.username, locale, `series/${series.slug}`)}
      className="group block rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-accent-300 focus-ring dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-accent-500/40"
    >
      <div className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-accent-700 dark:text-accent-400">
        <Mark className="h-2.5 w-auto" />
        <span>{t("seriesEyebrow")}</span>
        <span aria-hidden className="text-accent-300 dark:text-accent-500/50">
          ·
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          {t("seriesEpisodeCount", { count: series.postCount })}
        </span>
      </div>

      <h3 className="mt-1.5 text-[19px] font-bold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
        {series.title}
      </h3>

      <div className="mt-2.5 flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
        {series.author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={series.author.avatarUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-100 text-[10px] font-semibold text-accent-700">
            {series.author.username.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="truncate font-medium">{series.author.username}</span>
        <span aria-hidden>·</span>
        <span className="shrink-0">{t("seriesLastPublished", { date })}</span>
      </div>

      {/* Episode markers — a quiet visual for "this is a run of N posts", not interactive. */}
      <div className="mt-3.5 flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: dots }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 w-6 rounded-full bg-accent-200 transition-colors group-hover:bg-accent-300 dark:bg-accent-500/30 dark:group-hover:bg-accent-500/50"
          />
        ))}
      </div>
    </a>
  );
}
