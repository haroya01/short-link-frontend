import { useTranslations } from "next-intl";
import { Layers, TriangleAlert } from "lucide-react";
import { DATE_LOCALE } from "@/lib/date";
import type { FollowingSeriesNote } from "@/modules/blog/api/follows";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { SeriesNoteMarker } from "@/modules/blog/components/series-note-marker";
import { authorHref } from "@/modules/blog/lib/author-href";
import { contentLang } from "@/modules/blog/lib/content-lang";
import { seriesNoteHref } from "@/modules/blog/lib/series-items";

export function SeriesNoteFeedCard({ note, locale }: { note: FollowingSeriesNote; locale: string }) {
  const t = useTranslations("publicFeed");
  const username = note.author.username;
  const date = new Date(note.createdAt).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });

  return (
    <li
      className="group/note relative border-b border-slate-100 last:border-b-0 dark:border-slate-800"
      data-series-note={note.id}
    >
      <div className="-mx-3 rounded-surface px-3 py-5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
        <div className="flex min-w-0 items-center gap-2">
          <BlogLink
            href={authorHref(username, locale, `series/${note.series.slug}`)}
            className="focus-ring -mx-1 flex min-w-0 items-center gap-1.5 rounded px-1 text-[12px] font-medium text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400"
          >
            <Layers aria-hidden className="h-3 w-3 shrink-0 text-accent-700 dark:text-accent-400" />
            <span lang={contentLang(note.series.title)} className="truncate">
              {note.series.title}
            </span>
          </BlogLink>
          <SeriesNoteMarker label={t("seriesNoteMarker")} />
        </div>
        <BlogLink
          href={seriesNoteHref(username, note.id, locale)}
          className="focus-ring mt-1.5 block rounded"
          data-bhv="series"
          data-bhv-id={`${username}/notes/${note.id}`}
        >
          {note.contentWarning ? (
            <p className="flex items-start gap-1.5 text-[15px] font-medium leading-relaxed text-slate-800 transition-colors group-hover/note:text-accent-700 dark:text-slate-200 dark:group-hover/note:text-accent-400">
              <TriangleAlert aria-hidden className="mt-[3px] h-4 w-4 shrink-0" />
              <span lang={contentLang(note.contentWarning)}>{note.contentWarning}</span>
            </p>
          ) : (
            <p
              lang={contentLang(note.body)}
              className="line-clamp-4 whitespace-pre-line break-words text-[15px] leading-relaxed text-slate-800 transition-colors group-hover/note:text-accent-700 dark:text-slate-200 dark:group-hover/note:text-accent-400"
            >
              {note.body}
            </p>
          )}
        </BlogLink>
        <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
          <BlogLink
            href={authorHref(username, locale)}
            className="flex min-w-0 items-center gap-1.5 transition-colors hover:text-slate-900 dark:hover:text-slate-100"
          >
            <Avatar src={note.author.avatarUrl} name={username} size="xs" />
            <span className="truncate font-medium">{username}</span>
          </BlogLink>
          <span aria-hidden>·</span>
          <time dateTime={note.createdAt} className="shrink-0">
            {date}
          </time>
        </div>
      </div>
    </li>
  );
}
