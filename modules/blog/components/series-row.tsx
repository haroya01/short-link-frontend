import { useTranslations } from "next-intl";
import type { PublicSeriesCard } from "@/modules/blog/api/public-posts";
import { FeedRow, RowAuthor, RowDot } from "@/modules/blog/components/feed-row";
import { RowTime } from "@/modules/blog/components/row-time";
import { authorHref } from "@/modules/blog/lib/author-href";
import { contentLang } from "@/modules/blog/lib/content-lang";
import { seriesCardItems, seriesItemCount } from "@/modules/blog/lib/series-items";

/** A series as one feed row — "시리즈 · N편" over its name, the first episodes' titles as the lede, and
 *  the cover of the first episode that has one. The row opens the series. */
export function SeriesRow({ series, locale }: { series: PublicSeriesCard; locale: string }) {
  const t = useTranslations("publicFeed");
  const items = seriesCardItems(series);
  const username = series.author.username;
  const episodes = items.map((item) => item.title.trim()).filter(Boolean).join(" · ");

  return (
    <FeedRow
      href={authorHref(username, locale, `series/${series.slug}`)}
      title={series.title}
      titleLang={contentLang(series.title)}
      excerpt={episodes || null}
      excerptLang={episodes ? contentLang(episodes) : undefined}
      cover={items.find((item) => item.ogImageUrl)?.ogImageUrl ?? null}
      rowData={{ "data-series-row": series.id }}
      linkData={{ "data-bhv": "series", "data-bhv-id": `${username}/series/${series.slug}` }}
      top={
        <>
          <span className="font-medium">{t("seriesEyebrow")}</span>
          <RowDot />
          <span className="tabular-nums">{t("seriesEpisodeCount", { count: seriesItemCount(series) })}</span>
        </>
      }
      byline={
        <>
          <RowAuthor username={username} avatarUrl={series.author.avatarUrl} locale={locale} />
          <RowDot />
          <RowTime iso={series.lastPublishedAt} locale={locale} className="shrink-0" />
        </>
      }
    />
  );
}
