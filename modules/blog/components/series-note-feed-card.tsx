import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import type { FollowingSeriesNote } from "@/modules/blog/api/follows";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { FeedRow, RowAuthor, RowDot } from "@/modules/blog/components/feed-row";
import { RowTime } from "@/modules/blog/components/row-time";
import { authorHref } from "@/modules/blog/lib/author-href";
import { contentLang } from "@/modules/blog/lib/content-lang";
import { seriesNoteHref } from "@/modules/blog/lib/series-items";

export function SeriesNoteFeedCard({ note, locale }: { note: FollowingSeriesNote; locale: string }) {
  const t = useTranslations("publicFeed");
  const username = note.author.username;

  return (
    <FeedRow
      href={seriesNoteHref(username, note.id, locale)}
      excerpt={
        note.contentWarning ? (
          <>
            <TriangleAlert aria-hidden className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
            {note.contentWarning}
          </>
        ) : (
          note.body
        )
      }
      excerptLang={contentLang(note.contentWarning ?? note.body)}
      excerptIsBody={!note.contentWarning}
      rowData={{ "data-series-note": note.id }}
      linkData={{ "data-bhv": "series", "data-bhv-id": `${username}/notes/${note.id}` }}
      top={
        <>
          <BlogLink
            href={authorHref(username, locale, `series/${note.series.slug}`)}
            lang={contentLang(note.series.title)}
            className="focus-ring min-w-0 truncate rounded font-medium transition-colors hover:text-accent-700 dark:hover:text-accent-400"
          >
            {note.series.title}
          </BlogLink>
          <RowDot />
          <span className="shrink-0">{t("seriesNoteMarker")}</span>
        </>
      }
      byline={
        <>
          <RowAuthor username={username} avatarUrl={note.author.avatarUrl} locale={locale} />
          <RowDot />
          <RowTime iso={note.createdAt} locale={locale} className="shrink-0" />
        </>
      }
    />
  );
}
