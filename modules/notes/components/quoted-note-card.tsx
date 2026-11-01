"use client";

import { useLocale, useTranslations } from "next-intl";
import type { QuotedNote } from "@/modules/notes/api/notes";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { blogPath } from "@/lib/host";
import { authorHref } from "@/modules/blog/lib/author-href";
import { contentLang } from "@/modules/blog/lib/content-lang";
import { useCompactTime } from "@/modules/notes/lib/use-compact-time";
import { VariantImage } from "@/components/common/variant-image";
import { EmojiText } from "./emoji-text";

export function QuotedNoteCard({
  note,
  linked = true,
  full = false,
}: {
  note: QuotedNote;
  linked?: boolean;
  /** Carried in a blog post: the whole body, and the post spaces it like any other card. */
  full?: boolean;
}) {
  const locale = useLocale();
  const tNotes = useTranslations("notes");
  const ago = useCompactTime();
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-1.5 text-[14px] leading-5">
        <Avatar src={note.author.avatarUrl} name={note.author.displayName || note.author.username} handle={note.author.username} size="xs" />
        <span className="truncate font-semibold text-slate-900 dark:text-slate-100">{note.author.username}</span>
        <time dateTime={note.createdAt} suppressHydrationWarning className="shrink-0 text-slate-500 dark:text-slate-400">
          {ago(note.createdAt)}
        </time>
      </span>
      {note.contentWarning ? (
        <>
          <span
            lang={contentLang(note.contentWarning)}
            className="mt-1 line-clamp-2 break-words text-[15px] leading-[1.45] text-slate-900 dark:text-slate-100"
          >
            <EmojiText text={note.contentWarning} emojis={note.emojis} />
          </span>
          {note.body && (
            <span
              aria-hidden
              className="mt-0.5 line-clamp-2 select-none break-words text-[15px] leading-[1.45] text-slate-800 blur-[6px] dark:text-slate-200"
            >
              {note.body}
            </span>
          )}
        </>
      ) : (
        note.body && (
          <span
            lang={contentLang(note.body)}
            className={`mt-1 whitespace-pre-line break-words text-[15px] leading-[1.45] text-slate-800 dark:text-slate-200${full ? "" : " line-clamp-4"}`}
          >
            <EmojiText text={note.body} emojis={note.emojis} />
          </span>
        )
      )}
      {note.media.length > 0 && (
        <span className="mt-2 flex gap-1.5">
          {note.media.map((image) => {
            const concealed = Boolean(note.contentWarning) || note.sensitive === true;
            return (
              <span
                key={image.url}
                className="block h-16 w-16 shrink-0 overflow-hidden rounded-inner border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
              >
                <VariantImage
                  src={image.url}
                  alt={concealed ? tNotes("concealedPhoto") : image.altText ?? ""}
                  sizes="64px"
                  loading="lazy"
                  className={`h-full w-full object-cover${concealed ? " scale-110 blur-md" : ""}`}
                />
              </span>
            );
          })}
        </span>
      )}
    </>
  );
  const frame = `${full ? "" : "mt-2.5 "}block rounded-surface border border-slate-200 px-4 py-3 dark:border-slate-800`;
  if (!linked) {
    return (
      <div className={frame} data-quoted-note-id={note.id}>
        {content}
      </div>
    );
  }
  return (
    <BlogLink
      href={
        note.author.remoteId
          ? blogPath(`/remote/${note.author.remoteId}/notes/${note.id}`)
          : authorHref(note.author.username, locale, `notes/${note.id}`)
      }
      data-quoted-note-id={note.id}
      className={`focus-ring ${frame} transition-colors hover:bg-slate-50 dark:hover:bg-slate-900`}
    >
      {content}
    </BlogLink>
  );
}
