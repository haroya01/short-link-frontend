"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/use-confirm";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { authorHref } from "@/modules/blog/lib/author-href";
import { useRelativeTime } from "@/modules/notifications/lib/relative-time";
import { deleteNote, editNote, NOTE_MAX_LENGTH, setNoteLike, type Note } from "@/modules/notes/api/notes";
import { noteLength } from "@/modules/notes/lib/note-text";
import { NoteBody } from "./note-body";
import { NoteMediaGrid } from "./note-media";
import { QuotedPostCard } from "./quoted-post-card";

export function noteHref(note: Pick<Note, "id" | "author">, locale: string): string {
  return authorHref(note.author.username, locale, `notes/${note.id}`);
}

export function NoteCard({
  note,
  onChange,
  onDelete,
  emphasis = false,
  isNew = false,
  showAuthor = true,
}: {
  note: Note;
  onChange?: (note: Note) => void;
  onDelete?: (id: number) => void;
  emphasis?: boolean;
  isNew?: boolean;
  /** Off on single-author lists (an author's tab, my notes), where the row would repeat the header. */
  showAuthor?: boolean;
}) {
  const t = useTranslations("notes");
  const locale = useLocale();
  const ago = useRelativeTime();
  const { authenticated, me, signInWithGoogle } = useAuth();
  const [confirm, confirmDialog] = useConfirm();
  const mine = me?.id === note.author.id;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [busy, setBusy] = useState(false);
  const [liked, setLiked] = useState(note.likedByMe === true);
  const [likeCount, setLikeCount] = useState(note.likeCount);
  const [likeTouched, setLikeTouched] = useState(false);

  useEffect(() => {
    setLiked(note.likedByMe === true);
    setLikeCount(note.likeCount);
  }, [note.likedByMe, note.likeCount]);

  async function toggleLike() {
    if (!authenticated) {
      signInWithGoogle();
      return;
    }
    const next = !liked;
    setLikeTouched(true);
    setLiked(next);
    if (likeCount !== null) setLikeCount(likeCount + (next ? 1 : -1));
    try {
      const status = await setNoteLike(note.id, next);
      if (mine) setLikeCount(status.likeCount);
    } catch {
      setLiked(!next);
      if (likeCount !== null) setLikeCount(likeCount);
    }
  }

  async function save() {
    if (busy || noteLength(draft) > NOTE_MAX_LENGTH) return;
    setBusy(true);
    try {
      const saved = await editNote(note.id, draft);
      onChange?.(saved);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!(await confirm({ title: t("deleteConfirm"), confirmLabel: t("delete"), destructive: true }))) {
      return;
    }
    setBusy(true);
    try {
      await deleteNote(note.id);
      onDelete?.(note.id);
    } finally {
      setBusy(false);
    }
  }

  const overLimit = noteLength(draft) > NOTE_MAX_LENGTH;

  return (
    <article className={cn("py-5", emphasis && "py-6", isNew && "comment-in")} data-note-id={note.id}>
      <header className="flex items-center gap-2">
        {showAuthor && (
          <BlogLink
            href={authorHref(note.author.username, locale)}
            className="group/author flex min-w-0 items-center gap-2 rounded focus-ring"
          >
            <Avatar src={note.author.avatarUrl} name={note.author.username} size="sm" shrink={false} />
            <span className="truncate text-sm font-medium text-slate-900 transition-colors group-hover/author:text-accent-700 dark:text-slate-100 dark:group-hover/author:text-accent-400">
              @{note.author.username}
            </span>
          </BlogLink>
        )}
        <BlogLink
          href={noteHref(note, locale)}
          className="shrink-0 rounded text-[12px] text-slate-500 transition-colors hover:text-slate-800 focus-ring dark:text-slate-400 dark:hover:text-slate-200"
        >
          <time dateTime={note.createdAt}>{ago(note.createdAt)}</time>
          {note.editedAt && <span> · {t("edited")}</span>}
        </BlogLink>
        <div className="ml-auto flex shrink-0 items-center">
          {mine && !editing && <NoteMenu onEdit={() => setEditing(true)} onDelete={remove} disabled={busy} />}
        </div>
      </header>

      <div className={cn("mt-1.5", showAuthor && "pl-9")}>
        {editing ? (
          <div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              autoFocus
              aria-label={t("edit")}
              className="focus-ring max-h-[60vh] min-h-[4.5lh] w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px] leading-relaxed text-slate-900 [field-sizing:content] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <span
                className={cn(
                  "mr-auto text-[12px] tabular-nums",
                  overLimit ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400",
                )}
              >
                {t("counter", { count: noteLength(draft), max: NOTE_MAX_LENGTH })}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDraft(note.body);
                  setEditing(false);
                }}
                className="focus-ring rounded-lg px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy || overLimit || (!draft.trim() && note.media.length === 0)}
                className="focus-ring rounded-lg bg-accent-700 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-accent-800 disabled:opacity-50"
              >
                {t("save")}
              </button>
            </div>
          </div>
        ) : (
          <NoteBody body={note.body} large={emphasis} />
        )}
        <NoteMediaGrid media={note.media} />
        {note.quotedPost && <QuotedPostCard post={note.quotedPost} />}

        <footer className="mt-2 flex items-center gap-4 text-[13px]">
          <BlogLink
            href={noteHref(note, locale)}
            className="touch-target inline-flex items-center gap-1 rounded text-slate-500 transition-colors hover:text-accent-700 focus-ring dark:text-slate-400 dark:hover:text-accent-400"
            aria-label={t("replyCount", { count: note.replyCount })}
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            {note.replyCount > 0 && <span className="tabular-nums">{note.replyCount}</span>}
          </BlogLink>
          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={liked}
            aria-label={liked ? t("unlike") : t("like")}
            className={cn(
              "touch-target inline-flex items-center gap-1 rounded transition-colors focus-ring",
              liked
                ? "text-accent-700 dark:text-accent-400"
                : "text-slate-500 hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400",
            )}
          >
            <span key={liked ? "on" : "off"} className={cn("inline-flex", likeTouched && "subscribe-pop")}>
              <Heart className={cn("h-3.5 w-3.5", liked && "fill-accent-600 text-accent-600")} aria-hidden />
            </span>
            {mine && likeCount !== null && likeCount > 0 && (
              <span className="tabular-nums" title={t("likeCount", { count: likeCount })}>
                {likeCount}
              </span>
            )}
          </button>
        </footer>
      </div>
      {confirmDialog}
    </article>
  );
}

function NoteMenu({
  onEdit,
  onDelete,
  disabled,
}: {
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const t = useTranslations("notes");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "focus-ring block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-slate-100 dark:hover:bg-slate-800";
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={t("menu")}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="touch-target rounded text-slate-500 transition-colors hover:text-slate-800 focus-ring dark:text-slate-400 dark:hover:text-slate-200"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-8 z-20 w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-float dark:border-slate-800 dark:bg-slate-900"
        >
          <button
            type="button"
            role="menuitem"
            className={cn(item, "text-slate-700 dark:text-slate-200")}
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            {t("edit")}
          </button>
          <button
            type="button"
            role="menuitem"
            className={cn(item, "text-red-600 dark:text-red-400")}
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            {t("delete")}
          </button>
        </div>
      )}
    </div>
  );
}
