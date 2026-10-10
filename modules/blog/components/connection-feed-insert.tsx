"use client";

import { useTranslations } from "next-intl";
import { blogPath } from "@/lib/host";
import type { ConnectionEvent } from "@/modules/blog/api/collections";
import { authorHref, postHref } from "@/modules/blog/lib/author-href";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { quoteHref } from "@/modules/blog/components/connection-block";
import { FeedRow, RowAuthor, RowDot } from "@/modules/blog/components/feed-row";
import { RowTime } from "@/modules/blog/components/row-time";

export function ConnectionFeedInsert({ event, locale }: { event: ConnectionEvent; locale: string }) {
  const t = useTranslations("collections");

  const isNote = event.blockType === "NOTE";
  const author = event.username ?? (isNote ? event.curator.username : null);
  const href = isNote
    ? event.username && event.noteId
      ? authorHref(event.username, locale, `notes/${event.noteId}`)
      : blogPath(`/collections/${event.collectionId}`)
    : event.slug && event.username
      ? event.blockType === "HIGHLIGHT"
        ? quoteHref(event.username, event.slug, event.quote ?? "", locale)
        : postHref(event.username, event.slug, locale)
      : null;
  if (!href || !author) return null;

  const title = isNote ? null : event.title;
  const excerpt =
    event.blockType === "HIGHLIGHT"
      ? event.quote && `“${event.quote}”`
      : isNote
        ? event.body
        : event.why || event.excerpt;
  if (!title && !excerpt) return null;

  return (
    <FeedRow
      href={href}
      title={title}
      excerpt={excerpt}
      excerptIsBody={isNote}
      rowData={{ "data-connection-event": event.id }}
      linkData={{
        "data-bhv": "connection",
        "data-bhv-id": isNote ? `note/${event.noteId ?? event.id}` : `${author}/${event.slug}`,
      }}
      top={
        <>
          <span className="min-w-0 truncate">
            {t.rich("connectionMeta", {
              curator: (chunks) => (
                <BlogLink
                  href={authorHref(event.curator.username, locale)}
                  className="focus-ring rounded font-medium text-slate-600 transition-colors hover:text-accent-700 dark:text-slate-300 dark:hover:text-accent-400"
                >
                  {chunks}
                </BlogLink>
              ),
              collection: (chunks) => (
                <BlogLink
                  href={blogPath(`/collections/${event.collectionId}`)}
                  className="focus-ring rounded font-medium text-accent-700 transition-colors hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300"
                >
                  {chunks}
                </BlogLink>
              ),
              curatorName: event.curator.username,
              collectionName: event.collectionTitle,
            })}
          </span>
          {event.connectedAt && (
            <>
              <RowDot />
              <RowTime iso={event.connectedAt} locale={locale} className="shrink-0" />
            </>
          )}
        </>
      }
      byline={
        <RowAuthor
          username={author}
          avatarUrl={author === event.curator.username ? event.curator.avatarUrl : null}
          locale={locale}
        />
      }
    />
  );
}
