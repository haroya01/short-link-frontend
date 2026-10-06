"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, MoreHorizontal, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/use-confirm";
import { useToast } from "@/components/ui/toast";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { authorHref } from "@/modules/blog/lib/author-href";
import { useRelativeTime } from "@/modules/notifications/lib/relative-time";
import { deleteNote, editNote, NOTE_MAX_LENGTH, setNoteLike, type Note } from "@/modules/notes/api/notes";
import { noteLength } from "@/modules/notes/lib/note-text";
import { NoteBody } from "./note-body";
import { NoteMedia } from "./note-media";
import { QuotedPostCard } from "./quoted-post-card";

const NOTE_COUNTER_FROM = 50;

export function noteHref(note: Pick<Note, "id" | "author">, locale: string): string {
  return authorHref(note.author.username, locale, `notes/${note.id}`);
}

export function NoteCard({
  note,
  onChange,
  onDelete,
  emphasis = false,
  isNew = false,
}: {
  note: Note;
  onChange?: (note: Note) => void;
  onDelete?: (id: number) => void;
  emphasis?: boolean;
  isNew?: boolean;
}) {
  const t = useTranslations("notes");
  const locale = useLocale();
  const ago = useRelativeTime();
  const { authenticated, me, signInWithGoogle } = useAuth();
  const [confirm, confirmDialog] = useConfirm();
  const { toast } = useToast();
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

  async function share() {
    const url = new URL(noteHref(note, locale), window.location.href).toString();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url });
      } catch {
        return;
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast(t("linkCopied"));
    } catch {
      toast(t("linkCopyFailed"), "error");
    }
  }

  const overLimit = noteLength(draft) > NOTE_MAX_LENGTH;
  const action =
    "touch-target inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-slate-700 transition-colors hover:bg-slate-100 focus-ring dark:text-slate-300 dark:hover:bg-slate-800";

  return (
    <article className={cn("flex gap-3 py-4", emphasis && "py-5", isNew && "comment-in")} data-note-id={note.id}>
      <BlogLink
        href={authorHref(note.author.username, locale)}
        tabIndex={-1}
        aria-hidden
        className="shrink-0 self-start rounded-full"
      >
        <Avatar src={note.author.avatarUrl} name={note.author.username} size="md" />
      </BlogLink>
      <div className="min-w-0 flex-1">
        <header className="flex min-h-5 items-center gap-1.5 text-[15px] leading-5">
          <BlogLink
            href={authorHref(note.author.username, locale)}
            className="truncate rounded font-semibold text-slate-900 hover:underline focus-ring dark:text-slate-100"
          >
            {note.author.username}
          </BlogLink>
          <BlogLink
            href={noteHref(note, locale)}
            className="shrink-0 rounded text-slate-500 transition-colors hover:text-slate-800 focus-ring dark:text-slate-400 dark:hover:text-slate-200"
          >
            <time dateTime={note.createdAt}>{ago(note.createdAt)}</time>
            {note.editedAt && <span> · {t("edited")}</span>}
          </BlogLink>
          <div className="-my-2 ml-auto flex shrink-0 items-center">
            {mine && !editing && <NoteMenu onEdit={() => setEditing(true)} onDelete={remove} disabled={busy} />}
          </div>
        </header>

        <div className="mt-1">
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
                <NoteCounter length={noteLength(draft)} className="mr-auto" />
                <button
                  type="button"
                  onClick={() => {
                    setDraft(note.body);
                    setEditing(false);
                  }}
                  className="focus-ring rounded-full px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={busy || overLimit || (!draft.trim() && note.media.length === 0)}
                  className="focus-ring rounded-full bg-slate-900 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  {t("save")}
                </button>
              </div>
            </div>
          ) : (
            <NoteBody body={note.body} large={emphasis} />
          )}
        </div>
        <NoteMedia media={note.media} />
        {note.quotedPost && <QuotedPostCard post={note.quotedPost} />}

        <footer className="-mb-1 -ml-2 mt-1 flex items-center gap-1.5 text-[13px]">
          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={liked}
            aria-label={liked ? t("unlike") : t("like")}
            className={cn(action, liked && "text-accent-700 dark:text-accent-400")}
          >
            <span key={liked ? "on" : "off"} className={cn("inline-flex", likeTouched && "subscribe-pop")}>
              <Heart
                className={cn("h-[19px] w-[19px]", liked && "fill-accent-600 text-accent-600")}
                strokeWidth={1.75}
                aria-hidden
              />
            </span>
            {mine && likeCount !== null && likeCount > 0 && (
              <span className="tabular-nums" title={t("likeCount", { count: likeCount })}>
                {likeCount}
              </span>
            )}
          </button>
          <BlogLink
            href={noteHref(note, locale)}
            className={action}
            aria-label={t("replyCount", { count: note.replyCount })}
          >
            <MessageCircle className="h-[19px] w-[19px] -scale-x-100" strokeWidth={1.75} aria-hidden />
            {note.replyCount > 0 && <span className="tabular-nums">{note.replyCount}</span>}
          </BlogLink>
          <button type="button" onClick={share} aria-label={t("share")} className={action}>
            <Send className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          </button>
        </footer>
      </div>
      {confirmDialog}
    </article>
  );
}

export function NoteCounter({ length, className }: { length: number; className?: string }) {
  const t = useTranslations("notes");
  const left = NOTE_MAX_LENGTH - length;
  if (left > NOTE_COUNTER_FROM) return null;
  return (
    <span
      aria-live="polite"
      className={cn(
        "text-[13px] tabular-nums",
        left < 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400",
        className,
      )}
    >
      {left < 0 ? t("tooLong", { max: NOTE_MAX_LENGTH }) : t("remaining", { count: left })}
    </span>
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
