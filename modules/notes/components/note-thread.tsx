"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { authorHref } from "@/modules/blog/lib/author-href";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { useToast } from "@/components/ui/toast";
import {
  deleteNote,
  getNoteThread,
  listHiddenReplies,
  setNoteReplyHidden,
  type Note,
  type NoteThread,
} from "@/modules/notes/api/notes";
import { noteVerdict, useNoteFilters } from "@/modules/notes/lib/note-filters";
import { useBlockedNames } from "@/modules/blog/lib/user-blocks";
import { NoteCard } from "./note-card";
import { NoteComposer } from "./note-composer";
import { ReplyRestricted } from "./note-reply-policy";
import { SignInRow } from "@/components/auth/sign-in-row";

export function NoteThreadView({
  initial,
  seriesBanner,
  seriesNext,
}: {
  initial: NoteThread;
  seriesBanner?: ReactNode;
  seriesNext?: ReactNode;
}) {
  const t = useTranslations("notes");
  const locale = useLocale();
  const { ready, authenticated, me } = useAuth();
  const filters = useNoteFilters();
  const blocked = useBlockedNames();
  const [thread, setThread] = useState(initial);
  const [deleted, setDeleted] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [freshReplies, setFreshReplies] = useState<Set<number>>(new Set());
  const [hiddenReplies, setHiddenReplies] = useState<Note[] | null>(null);
  const [showingHidden, setShowingHidden] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!ready || !authenticated) return;
    getNoteThread(initial.note.id)
      .then(setThread)
      .catch((error) => {
        if (error instanceof ApiError && error.status === 404) setUnavailable(true);
      });
  }, [ready, authenticated, initial.note.id]);

  const replaceReply = (next: Note) =>
    setThread((current) => ({
      ...current,
      replies: current.replies.map((reply) => (reply.id === next.id ? next : reply)),
    }));

  const rootAuthorId =
    thread.note.inReplyToId === null
      ? thread.note.author.id
      : thread.parent && thread.parent.inReplyToId === null
        ? thread.parent.author.id
        : null;
  const moderates =
    thread.viewerCanModerate ??
    (thread.note.replyPolicy !== undefined && rootAuthorId !== null && rootAuthorId === me?.id);
  const hiddenCount = thread.hiddenReplyCount ?? 0;
  const countHidden = (current: NoteThread, change: number) =>
    current.hiddenReplyCount === undefined ? undefined : Math.max(0, current.hiddenReplyCount + change);

  async function toggleHiddenReplies() {
    if (showingHidden) {
      setShowingHidden(false);
      return;
    }
    if (hiddenReplies === null) {
      try {
        setHiddenReplies(await listHiddenReplies(thread.note.id));
      } catch {
        toast(t("hiddenRepliesFailed"), "error");
        return;
      }
    }
    setShowingHidden(true);
  }

  const byTime = (a: Note, b: Note) => a.createdAt.localeCompare(b.createdAt);

  async function setHidden(reply: Note, hidden: boolean) {
    try {
      await setNoteReplyHidden(reply.id, hidden);
    } catch {
      toast(t(hidden ? "hideReplyFailed" : "unhideReplyFailed"), "error");
      return;
    }
    const moved = { ...reply, hidden };
    setThread((current) => ({
      ...current,
      note: { ...current.note, replyCount: Math.max(0, current.note.replyCount + (hidden ? -1 : 1)) },
      replies: hidden
        ? current.replies.filter((r) => r.id !== reply.id)
        : [...current.replies, moved].sort(byTime),
      hiddenReplyCount: countHidden(current, hidden ? 1 : -1),
    }));
    setHiddenReplies((current) =>
      current === null
        ? null
        : hidden
          ? [...current, moved].sort(byTime)
          : current.filter((r) => r.id !== reply.id),
    );
    toast(t(hidden ? "replyHiddenToast" : "replyUnhiddenToast"));
  }

  async function removeReply(reply: Note) {
    try {
      await deleteNote(reply.id);
    } catch {
      toast(t("removeReplyFailed"), "error");
      return;
    }
    setThread((current) => ({
      ...current,
      note: {
        ...current.note,
        replyCount: reply.hidden ? current.note.replyCount : Math.max(0, current.note.replyCount - 1),
      },
      replies: current.replies.filter((r) => r.id !== reply.id),
      hiddenReplyCount: reply.hidden ? countHidden(current, -1) : current.hiddenReplyCount,
    }));
    setHiddenReplies((current) => current && current.filter((r) => r.id !== reply.id));
    toast(t("replyRemovedToast"));
  }

  const moderationFor = (reply: Note) =>
    moderates && reply.author.id !== me?.id
      ? {
          hidden: reply.hidden === true,
          onToggleHidden: () => void setHidden(reply, reply.hidden !== true),
          onRemove: () => void removeReply(reply),
        }
      : undefined;

  const parts = thread.continuation ?? [];
  const numbered = parts.length > 0 && thread.parent?.author.id !== thread.note.author.id;

  if (unavailable) {
    return (
      <p role="status" data-testid="note-unavailable" className="py-10 text-center text-[14px] text-slate-500 dark:text-slate-400">
        {t("threadUnavailable")}
      </p>
    );
  }

  if (deleted) {
    return (
      <p className="py-10 text-center text-[14px] text-slate-500 dark:text-slate-400">
        <BlogLink href={authorHref(initial.note.author.username, locale, "notes")} className="focus-ring rounded-surface underline">
          {t("backToNotes")}
        </BlogLink>
      </p>
    );
  }

  return (
    <div>
      {seriesBanner}
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
        position={numbered ? `1/${parts.length + 1}` : undefined}
        onChange={(note) => setThread((current) => ({ ...current, note }))}
        onDelete={() => setDeleted(true)}
      />
      {parts.map((part, index) => (
        <div key={part.id} className={index < parts.length - 1 ? "relative" : undefined}>
          {index < parts.length - 1 && (
            <span
              aria-hidden
              className="absolute -bottom-4 left-[17px] top-14 w-0.5 rounded-full bg-slate-200 dark:bg-slate-800"
            />
          )}
          <NoteCard
            note={part}
            position={numbered ? `${index + 2}/${parts.length + 1}` : undefined}
            onChange={(changed) =>
              setThread((current) => ({
                ...current,
                continuation: (current.continuation ?? []).map((p) => (p.id === changed.id ? changed : p)),
              }))
            }
            onDelete={(id) =>
              setThread((current) => ({
                ...current,
                continuation: (current.continuation ?? []).filter((p) => p.id !== id),
              }))
            }
          />
        </div>
      ))}

      {seriesNext}

      <section aria-labelledby="note-replies" className="border-t border-slate-100 pt-4 dark:border-slate-800">
        <h2 id="note-replies" className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
          {t("repliesTitle")}
        </h2>
        <div className="mt-1 border-b border-slate-100 dark:border-slate-800">
          {!ready ? (
            <div aria-hidden className="h-[60px]" />
          ) : authenticated && thread.note.canReply === false ? (
            <ReplyRestricted policy={thread.note.replyPolicy} />
          ) : authenticated ? (
            <NoteComposer
              inReplyToId={thread.note.id}
              threadReplyPolicy={thread.note.replyPolicy}
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
            <SignInRow reason="reply" placeholder={t("replyPlaceholder")} />
          )}
        </div>
        {thread.replies.length === 0 ? (
          <p className="py-6 text-[14px] text-slate-500 dark:text-slate-400">{t("noReplies")}</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {thread.replies.map((reply) => {
              const verdict = noteVerdict(reply, filters, "thread", me?.id);
              if (verdict?.action === "hide" || blocked.has(reply.author.username)) return null;
              return (
              <NoteCard
                key={reply.id}
                note={reply}
                isNew={freshReplies.has(reply.id)}
                filteredBy={verdict?.action === "warn" ? verdict.phrases : undefined}
                onChange={replaceReply}
                replyModeration={moderationFor(reply)}
                onDelete={(id) =>
                  setThread((current) => ({
                    ...current,
                    note: { ...current.note, replyCount: Math.max(0, current.note.replyCount - 1) },
                    replies: current.replies.filter((r) => r.id !== id),
                  }))
                }
              />
              );
            })}
          </div>
        )}
        {hiddenCount > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              aria-expanded={showingHidden}
              onClick={() => void toggleHiddenReplies()}
              className="focus-ring w-full rounded-surface py-3 text-left text-[14px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {showingHidden ? t("hiddenRepliesCollapse") : t("hiddenRepliesShow", { count: hiddenCount })}
            </button>
            {showingHidden && hiddenReplies && (
              <section
                data-testid="hidden-replies"
                aria-labelledby="hidden-replies-title"
                className="divide-y divide-slate-100 dark:divide-slate-800"
              >
                <h3 id="hidden-replies-title" className="pb-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                  {t("hiddenRepliesTitle")}
                </h3>
                {hiddenReplies.map((reply) => (
                  <NoteCard
                    key={reply.id}
                    note={reply}
                    onChange={(next) =>
                      setHiddenReplies((current) => current && current.map((r) => (r.id === next.id ? next : r)))
                    }
                    onDelete={(id) => {
                      setHiddenReplies((current) => current && current.filter((r) => r.id !== id));
                      setThread((current) => ({ ...current, hiddenReplyCount: countHidden(current, -1) }));
                    }}
                    replyModeration={moderationFor(reply)}
                  />
                ))}
              </section>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
