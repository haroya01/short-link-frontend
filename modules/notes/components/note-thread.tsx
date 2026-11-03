"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
import { ReplyRestricted } from "./note-reply-policy";
import { NoteReplyDialog } from "./note-reply-dialog";
import { askToSignIn } from "@/components/auth/login-prompt";
import { Avatar } from "@/modules/blog/components/avatar";
import { openNote } from "@/modules/notes/lib/note-href";
import { appendReplies, placeReply, threadNoteIds } from "@/modules/notes/lib/thread-reply";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";
import { useLiveScope } from "@/hooks/use-live-scope";
import { useHeldArrivals } from "@/hooks/use-held-arrivals";
import { readsOneByOne } from "@/lib/live-scope";
import { LivePill, LiveRow } from "@/components/common/live-arrivals";

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
  const [replying, setReplying] = useState(false);
  const [landed, setLanded] = useState<number | null>(null);
  const [viewerLoaded, setViewerLoaded] = useState(false);
  const [arriving, setArriving] = useState<Set<number>>(new Set());
  const [arrivedNote, setArrivedNote] = useState("");
  const threadRef = useRef(thread);
  const repliesEnd = useRef<HTMLDivElement>(null);
  const repliesSection = useRef<HTMLElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (landed === null) return;
    const row = document.querySelector(`[data-note-id="${landed}"]`);
    const reduce = prefersReducedMotion();
    row?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    setLanded(null);
  }, [landed]);

  function land(reply: Note) {
    setReplying(false);
    const placed = threadNoteIds(thread).has(reply.id)
      ? { thread, landing: "replies" as const }
      : placeReply(thread, reply);
    setThread(placed.thread);
    if (placed.landing === "elsewhere") {
      toast(t("replyPosted"), "default", {
        action: { label: t("view"), onClick: () => openNote(reply, locale, router.push) },
      });
      return;
    }
    setFreshReplies((current) => new Set(current).add(reply.id));
    setLanded(reply.id);
  }

  function startReply() {
    if (!authenticated) {
      askToSignIn("reply");
      return;
    }
    setReplying(true);
  }

  useEffect(() => {
    if (!ready || !authenticated) return;
    getNoteThread(initial.note.id)
      .then((next) => {
        setThread(next);
        setViewerLoaded(true);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 404) setUnavailable(true);
      });
  }, [ready, authenticated, initial.note.id]);

  useEffect(() => {
    threadRef.current = thread;
  }, [thread]);

  const arrivals = useHeldArrivals<Note>(
    () =>
      repliesEnd.current
        ? { element: repliesEnd.current, edge: "bottom" }
        : repliesSection.current
          ? { element: repliesSection.current, edge: "top" }
          : null,
    (items) => {
      setThread((current) => appendReplies(current, items));
      const ids = items.map((reply) => reply.id);
      setFreshReplies((current) => new Set([...current, ...ids]));
      setArriving((current) => new Set([...current, ...ids]));
      setArrivedNote(t("liveNewReplies", { count: items.length }));
    },
  );

  useLiveScope("note", initial.note.id, {
    enabled: viewerLoaded && !unavailable && !deleted,
    since: String(Math.max(0, ...threadNoteIds(thread))),
    known: (id) => threadNoteIds(threadRef.current).has(id) || arrivals.isHeld(id),
    refresh: async (change) => {
      const incoming = readsOneByOne(change)
        ? await Promise.all(change.ids.map((id) => getNoteThread(id).then((found) => found.note, () => null)))
        : (await getNoteThread(initial.note.id)).replies;
      const known = threadNoteIds(threadRef.current);
      arrivals.offer(
        incoming.filter((reply): reply is Note => reply !== null && reply.inReplyToId === initial.note.id && !known.has(reply.id)),
      );
    },
    onRevoked: () =>
      void getNoteThread(initial.note.id)
        .then(setThread)
        .catch((error) => {
          if (error instanceof ApiError && error.status === 404) setUnavailable(true);
        }),
  });

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
      <p role="status" data-testid="note-unavailable" className="py-8 text-[14px] text-slate-500 dark:text-slate-400">
        {t("threadUnavailable")}
      </p>
    );
  }

  if (deleted) {
    return (
      <p className="py-8 text-[14px] text-slate-500 dark:text-slate-400">
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
          <NoteCard note={thread.parent} onReplied={land} />
        </div>
      )}
      <NoteCard
        note={thread.note}
        emphasis
        position={numbered ? `1/${parts.length + 1}` : undefined}
        onChange={(note) => setThread((current) => ({ ...current, note }))}
        onDelete={() => setDeleted(true)}
        onReplied={land}
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
            isNew={freshReplies.has(part.id)}
            onReplied={land}
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

      <div className="border-y border-slate-100 dark:border-slate-800">
        {!ready ? (
          <div aria-hidden className="h-[60px]" />
        ) : authenticated && thread.note.canReply === false ? (
          <ReplyRestricted policy={thread.note.replyPolicy} />
        ) : (
          <button
            type="button"
            onClick={startReply}
            data-testid="note-reply-prompt"
            className="focus-ring flex w-full items-center gap-3 rounded-surface py-3 text-left"
          >
            {me ? (
              <Avatar src={me.avatarUrl ?? null} name={me.username ?? "?"} handle={me.username} size="md" />
            ) : (
              <span aria-hidden className="h-9 w-9 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800" />
            )}
            <span className="min-w-0 flex-1 truncate text-[15px] text-slate-500 dark:text-slate-400">
              {t("replyPrompt", { name: addressedName(thread.note.author) })}
            </span>
          </button>
        )}
      </div>

      <section ref={repliesSection} aria-labelledby={thread.replies.length > 0 ? "note-replies" : undefined}>
        {thread.replies.length > 0 && (
          <h2 id="note-replies" className="pt-4 text-[15px] font-semibold text-slate-900 dark:text-slate-100">
            {t("repliesTitle")}{" "}
            <span className="font-normal tabular-nums text-slate-500 dark:text-slate-400">{thread.replies.length}</span>
          </h2>
        )}
        {thread.replies.length > 0 && (
          <div ref={repliesEnd} className="divide-y divide-slate-100 dark:divide-slate-800">
            {thread.replies.map((reply) => {
              const verdict = noteVerdict(reply, filters, "thread", me?.id);
              if (verdict?.action === "hide" || blocked.has(reply.author.username)) return null;
              return (
              <LiveRow key={reply.id} arriving={arriving.has(reply.id)}>
              <NoteCard
                note={reply}
                isNew={freshReplies.has(reply.id)}
                filteredBy={verdict?.action === "warn" ? verdict.phrases : undefined}
                onChange={replaceReply}
                onReplied={land}
                replyModeration={moderationFor(reply)}
                onDelete={(id) =>
                  setThread((current) => ({
                    ...current,
                    note: { ...current.note, replyCount: Math.max(0, current.note.replyCount - 1) },
                    replies: current.replies.filter((r) => r.id !== id),
                  }))
                }
              />
              </LiveRow>
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
      <LivePill
        count={arrivals.held}
        label={t("liveNewReplies", { count: arrivals.held })}
        onShow={arrivals.show}
        announce={arrivedNote}
      />
      <NoteReplyDialog target={replying ? thread.note : null} onClose={() => setReplying(false)} onReplied={land} />
    </div>
  );
}

function addressedName(author: Note["author"]): string {
  return author.displayName || `@${author.username.split("@")[0]}`;
}
