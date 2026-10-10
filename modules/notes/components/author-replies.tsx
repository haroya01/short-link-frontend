"use client";

import { useCallback, useRef } from "react";
import { CornerUpLeft, MessageCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { BlogLink } from "@/modules/blog/components/blog-link";
import {
  listAuthorReplies,
  type Note,
  type NoteFeed,
  type ProfileRepliesFeed,
  type ReplyingTo,
} from "@/modules/notes/api/notes";
import { noteHref } from "@/modules/notes/lib/note-href";
import { NoteList } from "./note-list";

export function ReplyContext({ replyingTo }: { replyingTo: ReplyingTo | null }) {
  const t = useTranslations("notes");
  const locale = useLocale();
  return (
    <p
      data-testid="reply-context"
      className="-mt-1 mb-1.5 flex items-center gap-3 text-[13px] text-slate-500 dark:text-slate-400"
    >
      <span className="flex w-9 shrink-0 justify-end">
        <CornerUpLeft aria-hidden className="h-3.5 w-3.5" />
      </span>
      {replyingTo ? (
        <BlogLink
          href={noteHref(replyingTo, locale)}
          className="focus-ring min-w-0 truncate rounded hover:text-slate-800 hover:underline dark:hover:text-slate-200"
        >
          <span className="font-medium">{t("replyingToAuthor", { username: replyingTo.author.username })}</span>
          {replyingTo.excerpt && <span> · {replyingTo.excerpt}</span>}
        </BlogLink>
      ) : (
        <span className="truncate">{t("replyParentGone")}</span>
      )}
    </p>
  );
}

export function AuthorReplies({ username, initial }: { username: string; initial: ProfileRepliesFeed | null }) {
  const t = useTranslations("notes");
  const parents = useRef(new Map<number, ReplyingTo | null>());
  const flatten = useCallback((feed: ProfileRepliesFeed): NoteFeed => {
    for (const item of feed.items) parents.current.set(item.note.id, item.replyingTo);
    return { items: feed.items.map((item) => item.note), page: feed.page, hasNext: feed.hasNext };
  }, []);
  const first = useRef(initial ? flatten(initial) : null);
  const load = useCallback(
    (page: number) => listAuthorReplies(username, page).then(flatten),
    [username, flatten],
  );
  return (
    <NoteList
      load={load}
      initial={first.current}
      filterContext="account"
      contextFor={(note: Note) => <ReplyContext replyingTo={parents.current.get(note.id) ?? null} />}
      empty={<BlogEmpty icon={MessageCircle} title={t("emptyReplies")} />}
    />
  );
}
