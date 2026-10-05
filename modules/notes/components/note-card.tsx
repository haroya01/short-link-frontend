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
}: {
  note: Note;
  onChange?: (note: Note) => void;
  onDelete?: (id: number) => void;
  emphasis?: boolean;
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
    <article className={cn("py-5", emphasis && "py-6")} data-note-id={note.id}>
      <header className="flex items-center gap-2.5">
        <BlogLink href={authorHref(note.author.username, locale)} className="focus-ring rounded-full">
          <Avatar src={note.author.avatarUrl} name={note.author.username} size="sm" />
        </BlogLink>
        <div className="flex min-w-0 flex-1 items-baseline gap-1.5 text-[14px]">
          <BlogLink
            href={authorHref(note.author.username, locale)}
            className="focus-ring truncate rounded-md font-semibold text-slate-900 hover:underline dark:text-slate-100"
          >
            @{note.author.username}
          </BlogLink>
          <span aria-hidden className="text-slate-400">·</span>
          <BlogLink
            href={noteHref(note, locale)}
            className="focus-ring shrink-0 rounded-md text-slate-500 hover:underline dark:text-slate-400"
          >
            <time dateTime={note.createdAt}>{ago(note.createdAt)}</time>
          </BlogLink>
          {note.editedAt && (
            <span className="shrink-0 text-[12px] text-slate-400 dark:text-slate-500">{t("edited")}</span>
          )}
        </div>
        {mine && !editing && <NoteMenu onEdit={() => setEditing(true)} onDelete={remove} disabled={busy} />}
      </header>

      <div className="mt-2 pl-[38px]">
        {editing ? (
          <div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              aria-label={t("edit")}
              className="focus-ring w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px] leading-relaxed text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <span className={cn("mr-auto text-[12px] tabular-nums", overLimit ? "text-red-600" : "text-slate-400")}>
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
          <NoteBody body={note.body} />
        )}
        <NoteMediaGrid media={note.media} />
        {note.quotedPost && <QuotedPostCard post={note.quotedPost} />}

        <footer className="mt-3 flex items-center gap-5 text-[13px] text-slate-500 dark:text-slate-400">
          <BlogLink
            href={noteHref(note, locale)}
            className="focus-ring inline-flex items-center gap-1.5 rounded-md hover:text-slate-800 dark:hover:text-slate-200"
            aria-label={t("replyCount", { count: note.replyCount })}
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            {note.replyCount > 0 && <span className="tabular-nums">{note.replyCount}</span>}
          </BlogLink>
          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={liked}
            aria-label={liked ? t("unlike") : t("like")}
            className="focus-ring inline-flex items-center gap-1.5 rounded-md hover:text-slate-800 dark:hover:text-slate-200"
          >
            <Heart className={cn("h-4 w-4", liked && "fill-accent-600 text-accent-600")} aria-hidden />
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
        className="focus-ring rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
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
