"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { HomePostRow } from "@/modules/blog/components/home-post-row";
import { postHref } from "@/modules/blog/lib/author-href";
import type { Note } from "@/modules/notes/api/notes";
import { NoteFeedRow } from "@/modules/notes/components/note-list";
import { noteHref } from "@/modules/notes/lib/note-href";
import type { RoomItem, RoomReply } from "@/modules/rooms/api/rooms";

function replyName(reply: RoomReply): string {
  return reply.author.displayName?.trim() || reply.author.username;
}

export function replyTotal(item: RoomItem): number {
  return Math.max(item.kind === "note" ? item.note.replyCount : item.post.commentCount, item.replies.length);
}

export function RoomItemRow({
  item,
  maxReplies,
  isNew = false,
  context,
  onReplace,
  onRemove,
}: {
  item: RoomItem;
  maxReplies: number;
  isNew?: boolean;
  context?: ReactNode;
  onReplace: (note: Note) => void;
  onRemove: (id: number) => void;
}) {
  const locale = useLocale();
  const replies = item.replies.slice(0, maxReplies);
  const href =
    item.kind === "note" ? noteHref(item.note, locale) : `${postHref(item.post.author.username, item.post.slug, locale)}#comments`;
  return (
    <div data-room-item={item.kind === "note" ? `note-${item.note.id}` : `post-${item.post.id}`}>
      {item.kind === "note" ? (
        <NoteFeedRow note={item.note} isNew={isNew} context={context} onReplace={onReplace} onRemove={onRemove} />
      ) : (
        <HomePostRow post={item.post} context={context} />
      )}
      {replies.length > 0 && <RoomReplyPreview replies={replies} total={replyTotal(item)} href={href} />}
    </div>
  );
}

function RoomReplyPreview({ replies, total, href }: { replies: RoomReply[]; total: number; href: string }) {
  const t = useTranslations("rooms");
  return (
    <BlogLink
      href={href}
      data-room-replies
      className="focus-ring -mt-1 mb-3 ml-12 flex gap-2.5 rounded-surface py-0.5 pr-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60"
    >
      <span aria-hidden className="w-0.5 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
      <span className="min-w-0 flex-1 space-y-1.5 py-0.5">
        {replies.map((reply) => (
          <span key={reply.id} data-room-reply className="flex items-start gap-2">
            <Avatar src={reply.author.avatarUrl} name={replyName(reply)} seed={reply.author.id} size="xs" />
            <span className="line-clamp-2 min-w-0 text-[14px] leading-5 text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{replyName(reply)}</span>
              <span aria-hidden>{"  "}</span>
              {reply.body}
            </span>
          </span>
        ))}
        {total > replies.length && (
          <span className="block text-[13px] font-semibold text-slate-500 dark:text-slate-400">
            {t("allReplies", { count: total })}
          </span>
        )}
      </span>
    </BlogLink>
  );
}
