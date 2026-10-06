"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { authorHref } from "@/modules/blog/lib/author-href";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { getNoteThread, type Note, type NoteThread } from "@/modules/notes/api/notes";
import { NoteCard } from "./note-card";
import { NoteComposer, NoteSignInRow } from "./note-composer";

export function NoteThreadView({ initial }: { initial: NoteThread }) {
  const t = useTranslations("notes");
  const locale = useLocale();
  const { ready, authenticated } = useAuth();
  const [thread, setThread] = useState(initial);
  const [deleted, setDeleted] = useState(false);
  const [freshReplies, setFreshReplies] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!ready || !authenticated) return;
    getNoteThread(initial.note.id)
      .then(setThread)
      .catch(() => undefined);
  }, [ready, authenticated, initial.note.id]);

  const replaceReply = (next: Note) =>
    setThread((current) => ({
      ...current,
      replies: current.replies.map((reply) => (reply.id === next.id ? next : reply)),
    }));

  if (deleted) {
    return (
      <p className="py-10 text-center text-[14px] text-slate-500 dark:text-slate-400">
        <BlogLink href={authorHref(initial.note.author.username, locale, "notes")} className="focus-ring rounded-md underline">
          {t("backToNotes")}
        </BlogLink>
      </p>
    );
  }

  return (
    <div>
      {thread.parent && (
        <div className="relative">
          <span
            aria-hidden
            className="absolute -bottom-4 left-[17px] top-14 w-0.5 rounded-full bg-slate-200 dark:bg-slate-800"
          />
          <NoteCard note={thread.parent} />
        </div>
      )}
      <NoteCard
        note={thread.note}
        emphasis
        onChange={(note) => setThread((current) => ({ ...current, note }))}
        onDelete={() => setDeleted(true)}
      />

      <section aria-labelledby="note-replies" className="border-t border-slate-100 pt-4 dark:border-slate-800">
        <h2 id="note-replies" className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
          {t("repliesTitle")}
        </h2>
        <div className="mt-1 border-b border-slate-100 dark:border-slate-800">
          {authenticated ? (
            <NoteComposer
              inReplyToId={thread.note.id}
              onCreated={(reply) => {
                setFreshReplies((current) => new Set(current).add(reply.id));
                setThread((current) => ({
                  ...current,
                  note: { ...current.note, replyCount: current.note.replyCount + 1 },
                  replies: [...current.replies, reply],
                }));
              }}
            />
          ) : (
            <NoteSignInRow label={t("loginToReply")} placeholder={t("replyPlaceholder")} />
          )}
        </div>
        {thread.replies.length === 0 ? (
          <p className="py-6 text-[14px] text-slate-500 dark:text-slate-400">{t("noReplies")}</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {thread.replies.map((reply) => (
              <NoteCard
                key={reply.id}
                note={reply}
                isNew={freshReplies.has(reply.id)}
                onChange={replaceReply}
                onDelete={(id) =>
                  setThread((current) => ({
                    ...current,
                    note: { ...current.note, replyCount: Math.max(0, current.note.replyCount - 1) },
                    replies: current.replies.filter((r) => r.id !== id),
                  }))
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
