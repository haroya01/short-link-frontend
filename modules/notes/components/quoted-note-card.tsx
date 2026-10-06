"use client";

import { useLocale } from "next-intl";
import type { QuotedNote } from "@/modules/notes/api/notes";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { authorHref } from "@/modules/blog/lib/author-href";
import { useCompactTime } from "@/modules/notes/lib/use-compact-time";

export function QuotedNoteCard({ note, linked = true }: { note: QuotedNote; linked?: boolean }) {
  const locale = useLocale();
  const ago = useCompactTime();
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-1.5 text-[14px] leading-5">
        <Avatar src={note.author.avatarUrl} name={note.author.username} size="xs" />
        <span className="truncate font-semibold text-slate-900 dark:text-slate-100">{note.author.username}</span>
        <time dateTime={note.createdAt} suppressHydrationWarning className="shrink-0 text-slate-500 dark:text-slate-400">
          {ago(note.createdAt)}
        </time>
      </span>
      {note.body && (
        <span className="mt-1 line-clamp-4 whitespace-pre-line break-words text-[15px] leading-[1.45] text-slate-800 dark:text-slate-200">
          {note.body}
        </span>
      )}
      {note.media.length > 0 && (
        <span className="mt-2 flex gap-1.5">
          {note.media.map((image) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={image.url}
              src={image.url}
              alt={image.altText ?? ""}
              loading="lazy"
              className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </span>
      )}
    </>
  );
  const frame = "mt-2.5 block rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800";
  if (!linked) {
    return (
      <div className={frame} data-quoted-note-id={note.id}>
        {content}
      </div>
    );
  }
  return (
    <BlogLink
      href={authorHref(note.author.username, locale, `notes/${note.id}`)}
      data-quoted-note-id={note.id}
      className={`focus-ring ${frame} transition-colors hover:bg-slate-50 dark:hover:bg-slate-900`}
    >
      {content}
    </BlogLink>
  );
}
