"use client";

import { useEffect, useRef, useState } from "react";
import { EyeOff, MoreHorizontal, Pin, Quote, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/use-confirm";
import { useToast } from "@/components/ui/toast";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { authorHref } from "@/modules/blog/lib/author-href";
import { useCompactTime } from "@/modules/notes/lib/use-compact-time";
import {
  deleteNote,
  editNote,
  NOTE_MAX_LENGTH,
  setNoteBookmark,
  setNoteLike,
  setNotePin,
  isShareable,
  setNoteRepost,
  type Note,
} from "@/modules/notes/api/notes";
import { noteLength } from "@/modules/notes/lib/note-text";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { NoteBody } from "./note-body";
import { NoteMedia } from "./note-media";
import { NotePollCard } from "./note-poll";
import { NoteGlyph } from "./note-glyph";
import { NoteHistoryDialog } from "./note-history-dialog";
import { VisibilityIcon } from "./note-visibility";
import { NoteLinkCard } from "./note-link-card";
import { NoteQuoteDialog } from "./note-quote-dialog";
import { QuotedNoteCard } from "./quoted-note-card";
import { QuotedPostCard } from "./quoted-post-card";
import { ConnectSheet } from "@/modules/blog/components/connect-sheet";

const NOTE_RING_NUMBER_FROM = 20;

export function noteHref(note: Pick<Note, "id" | "author">, locale: string): string {
  return authorHref(note.author.username, locale, `notes/${note.id}`);
}

const FEDERATION_HOST = process.env.NEXT_PUBLIC_KURL_HOST ?? "kurl.me";

export function NoteCard({
  note,
  onChange,
  onDelete,
  onQuoted,
  emphasis = false,
  isNew = false,
  repostedBy,
  showsPin = false,
}: {
  note: Note;
  onChange?: (note: Note) => void;
  onDelete?: (id: number) => void;
  onQuoted?: (note: Note) => void;
  emphasis?: boolean;
  isNew?: boolean;
  repostedBy?: string;
  /** Only the author's profile marks pins; on Mastodon a pin means nothing anywhere else. */
  showsPin?: boolean;
}) {
  const t = useTranslations("notes");
  const locale = useLocale();
  const ago = useCompactTime();
  const router = useRouter();
  const { authenticated, me, signInWithGoogle } = useAuth();
  const [confirm, confirmDialog] = useConfirm();
  const { toast } = useToast();
  const mine = me?.id === note.author.id;
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [mediaShown, setMediaShown] = useState(false);
  const [showingHistory, setShowingHistory] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [busy, setBusy] = useState(false);
  const [liked, setLiked] = useState(note.likedByMe === true);
  const [likeCount, setLikeCount] = useState(note.likeCount);
  const [likeTouched, setLikeTouched] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [bookmarked, setBookmarked] = useState(note.bookmarkedByMe === true);
  const tCollections = useTranslations("collections");

  useEffect(() => {
    setLiked(note.likedByMe === true);
    setLikeCount(note.likeCount);
  }, [note.likedByMe, note.likeCount]);

  useEffect(() => {
    setBookmarked(note.bookmarkedByMe === true);
  }, [note.bookmarkedByMe]);

  async function toggleBookmark() {
    if (!authenticated) {
      signInWithGoogle();
      return;
    }
    const next = !bookmarked;
    setBookmarked(next);
    try {
      await setNoteBookmark(note.id, next);
      toast(next ? t("bookmarked") : t("unbookmarked"));
    } catch {
      setBookmarked(!next);
      toast(t("bookmarkFailed"), "error");
    }
  }

  async function toggleLike() {
    if (!authenticated) {
      signInWithGoogle();
      return;
    }
    const next = !liked;
    const previous = likeCount;
    setLikeTouched(true);
    setLiked(next);
    setLikeCount(Math.max((likeCount ?? 0) + (next ? 1 : -1), 0));
    try {
      const status = await setNoteLike(note.id, next);
      setLikeCount(status.likeCount);
    } catch {
      setLiked(!next);
      setLikeCount(previous);
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

  async function togglePin() {
    try {
      const { pinned } = await setNotePin(note.id, !note.pinned);
      onChange?.({ ...note, pinned });
      toast(pinned ? t("pinned") : t("unpinned"));
    } catch (e) {
      toast(e instanceof ApiError && e.detail.code === "NOTE_PIN_LIMIT" ? t("pinLimit") : t("pinFailed"), "error");
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

  function openFromBody(e: React.MouseEvent<HTMLDivElement>) {
    if (emphasis || editing) return;
    if ((e.target as HTMLElement).closest("a, button, textarea, [role='menu']")) return;
    if (window.getSelection()?.toString()) return;
    const href = noteHref(note, locale);
    if (/^https?:\/\//.test(href)) window.location.assign(href);
    else router.push(href);
  }

  const overLimit = noteLength(draft) > NOTE_MAX_LENGTH;
  const action =
    "touch-target inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-slate-700 transition-colors hover:bg-slate-100 focus-ring dark:text-slate-300 dark:hover:bg-slate-800";

  return (
    <article className={cn("py-4", emphasis && "py-5", isNew && "comment-in")} data-note-id={note.id}>
      {repostedBy && (
        <p className="-mt-1 mb-1.5 flex items-center gap-3 text-[13px] font-medium text-slate-500 dark:text-slate-400">
          <span className="flex w-9 shrink-0 justify-end">
            <NoteGlyph name="repost" className="h-3.5 w-3.5" />
          </span>
          <span className="truncate">{t("repostedBy", { username: repostedBy })}</span>
        </p>
      )}
      {!repostedBy && showsPin && note.pinned && (
        <p className="-mt-1 mb-1.5 flex items-center gap-3 text-[13px] font-medium text-slate-500 dark:text-slate-400">
          <span className="flex w-9 shrink-0 justify-end">
            <Pin className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span>{t("pinnedLabel")}</span>
        </p>
      )}
      <div className={emphasis ? "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3" : "flex gap-3"}>
        <BlogLink
          href={authorHref(note.author.username, locale)}
          tabIndex={-1}
          aria-hidden
          className="shrink-0 self-start rounded-full"
        >
          <Avatar src={note.author.avatarUrl} name={note.author.username} size={emphasis ? "lg" : "md"} />
        </BlogLink>
        <div className={emphasis ? "contents" : "min-w-0 flex-1"}>
          <header className="flex min-h-5 items-center gap-1.5 text-[15px] leading-5">
            {emphasis ? (
              <div className="min-w-0">
                <BlogLink
                  href={authorHref(note.author.username, locale)}
                  className="block truncate rounded font-semibold text-slate-900 hover:underline focus-ring dark:text-slate-100"
                >
                  {note.author.username}
                </BlogLink>
                <span className="block truncate text-[13px] text-slate-500 dark:text-slate-400">
                  @{note.author.username}@{FEDERATION_HOST}
                </span>
              </div>
            ) : (
              <BlogLink
                href={authorHref(note.author.username, locale)}
                className="truncate rounded font-semibold text-slate-900 hover:underline focus-ring dark:text-slate-100"
              >
                {note.author.username}
              </BlogLink>
            )}
            {!emphasis && (
              <BlogLink
                href={noteHref(note, locale)}
                className="shrink-0 rounded text-slate-500 transition-colors hover:text-slate-800 focus-ring dark:text-slate-400 dark:hover:text-slate-200"
              >
                <time dateTime={note.createdAt} suppressHydrationWarning>
                  {ago(note.createdAt)}
                </time>
                {note.editedAt && <span> · {t("edited")}</span>}
              </BlogLink>
            )}
            {note.visibility && note.visibility !== "public" && (
              <VisibilityIcon
                visibility={note.visibility}
                label={t(`visibilityShort.${note.visibility}`)}
                className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400"
              />
            )}
            <div className="-my-2 ml-auto flex shrink-0 items-center gap-2">
              {emphasis && (
                <FollowButton username={note.author.username} initialFollowerCount={0} compact quiet />
              )}
              {authenticated && !editing && (
                <NoteMenu
                  bookmarked={bookmarked}
                  onBookmark={toggleBookmark}
                  onConnect={() => setConnecting(true)}
                  onEdit={mine ? () => setEditing(true) : undefined}
                  onDelete={mine ? remove : undefined}
                  pinned={note.pinned === true}
                  onPin={mine && note.inReplyToId === null ? togglePin : undefined}
                  disabled={busy}
                />
              )}
            </div>
          </header>

          {note.contentWarning && (
            <div
              className={cn(
                "mt-1.5 flex items-center gap-2 rounded-lg bg-slate-100 py-1.5 pl-3 pr-1.5 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
                emphasis && "col-span-2 mt-3",
              )}
              data-note-warning
            >
              <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
              <span className={cn("min-w-0 flex-1 break-words font-medium", emphasis ? "text-[17px]" : "text-[15px]")}>
                {note.contentWarning}
              </span>
              <button
                type="button"
                onClick={() => setRevealed((open) => !open)}
                aria-expanded={revealed}
                className="focus-ring shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1 text-[13px] font-semibold hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                {revealed ? t("hideContent") : t("showContent")}
              </button>
            </div>
          )}
          <div
            className={emphasis ? "col-span-2 mt-3" : "cursor-pointer"}
            onClick={openFromBody}
            data-note-body
          >
            {(!note.contentWarning || revealed || editing) && (
              <>
            <div className={emphasis ? undefined : "mt-1"}>
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
                    <NoteLengthRing length={noteLength(draft)} className="mr-auto" />
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
                      className="focus-ring rounded-full bg-accent-700 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-accent-800 disabled:opacity-40"
                    >
                      {t("save")}
                    </button>
                  </div>
                </div>
              ) : (
                <NoteBody body={note.body} mentions={note.mentions} large={emphasis} />
              )}
            </div>
            {note.poll && (
              <NotePollCard noteId={note.id} poll={note.poll} onVoted={(poll) => onChange?.({ ...note, poll })} />
            )}
            {note.sensitive && !note.contentWarning && !mediaShown && note.media.length > 0 ? (
              <button
                type="button"
                onClick={() => setMediaShown(true)}
                className="focus-ring mt-2.5 flex h-40 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 text-[13px] font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                data-note-sensitive
              >
                <EyeOff className="h-4 w-4" aria-hidden />
                {t("sensitiveMedia")}
              </button>
            ) : (
              <NoteMedia media={note.media} />
            )}
            {note.quotedPost && <QuotedPostCard post={note.quotedPost} />}
            {note.quotedNote && <QuotedNoteCard note={note.quotedNote} />}
            {note.linkPreview && <NoteLinkCard preview={note.linkPreview} />}
              </>
            )}

            {emphasis && (
              <p className="mt-4 text-[13px] text-slate-500 dark:text-slate-400">
                <time dateTime={note.createdAt} suppressHydrationWarning>
                  {new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(
                    new Date(note.createdAt),
                  )}
                  {" · "}
                  {new Intl.DateTimeFormat(locale, {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(new Date(note.createdAt))}
                </time>
                {note.editedAt && (
                  <>
                    {" · "}
                    <button
                      type="button"
                      onClick={() => setShowingHistory(true)}
                      className="focus-ring rounded underline decoration-slate-300 underline-offset-2 hover:text-slate-800 dark:decoration-slate-600 dark:hover:text-slate-200"
                    >
                      {t("edited")}
                    </button>
                    <NoteHistoryDialog
                      noteId={note.id}
                      open={showingHistory}
                      onClose={() => setShowingHistory(false)}
                    />
                  </>
                )}
              </p>
            )}

            <footer
              className={cn(
                "-mb-1 flex items-center text-[13px]",
                emphasis
                  ? "mt-3 justify-between border-t border-slate-100 pt-2 dark:border-slate-800"
                  : "-ml-2 mt-1 gap-1.5",
              )}
            >
              <button
                type="button"
                onClick={toggleLike}
                aria-pressed={liked}
                aria-label={liked ? t("unlike") : t("like")}
                className={cn(action, liked && "text-accent-700 dark:text-accent-400")}
              >
                <span key={liked ? "on" : "off"} className={cn("inline-flex", likeTouched && "subscribe-pop")}>
                  <NoteGlyph
                    name="heart"
                    active={liked}
                    className={cn("h-[18px] w-[18px]", liked && "text-accent-600")}
                  />
                </span>
                {likeCount !== null && likeCount > 0 && (
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
                <NoteGlyph name="reply" className="h-[18px] w-[18px]" />
                {note.replyCount > 0 && <span className="tabular-nums">{note.replyCount}</span>}
              </BlogLink>
              <RepostControl note={note} buttonClass={action} onQuote={() => setQuoting(true)} />
              {emphasis && (
                <button
                  type="button"
                  onClick={toggleBookmark}
                  aria-pressed={bookmarked}
                  aria-label={bookmarked ? t("unbookmark") : t("bookmark")}
                  className={cn(action, bookmarked && "text-accent-700 dark:text-accent-400")}
                >
                  <NoteGlyph name="bookmark" active={bookmarked} className="h-[18px] w-[18px]" />
                </button>
              )}
              <button type="button" onClick={share} aria-label={t("share")} className={action}>
                <NoteGlyph name="share" className="h-[18px] w-[18px]" />
              </button>
            </footer>
            {emphasis && (note.quoteCount ?? 0) > 0 && (
              <BlogLink
                href={`${noteHref(note, locale)}/quotes`}
                className="focus-ring mt-3 flex items-center justify-between rounded border-t border-slate-100 pt-3 text-[13px] font-semibold text-slate-500 hover:text-slate-800 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {t("quotesLink", { count: note.quoteCount ?? 0 })}
                <span aria-hidden>›</span>
              </BlogLink>
            )}
          </div>
        </div>
      </div>
      {confirmDialog}
      {connecting && (
        <ConnectSheet
          blockType="NOTE"
          refId={note.id}
          targetLabel={tCollections("blockNote")}
          targetTitle={note.body}
          onClose={() => setConnecting(false)}
          onDone={() => setConnecting(false)}
        />
      )}
      <NoteQuoteDialog
        quoted={quoting ? { note } : null}
        onClose={() => setQuoting(false)}
        onPosted={(created) => {
          setQuoting(false);
          toast(t("quotePosted"));
          onQuoted?.(created);
        }}
      />
    </article>
  );
}

function RepostControl({
  note,
  buttonClass,
  onQuote,
}: {
  note: Note;
  buttonClass: string;
  onQuote: () => void;
}) {
  const t = useTranslations("notes");
  const { authenticated, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const shareable = isShareable(note.visibility);
  const [reposted, setReposted] = useState(note.repostedByMe === true);
  const [count, setCount] = useState(note.repostCount ?? null);
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReposted(note.repostedByMe === true);
    setCount(note.repostCount ?? null);
  }, [note.repostedByMe, note.repostCount]);

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

  async function toggle() {
    setOpen(false);
    const next = !reposted;
    const previous = count;
    setTouched(true);
    setReposted(next);
    setCount(Math.max((count ?? 0) + (next ? 1 : -1), 0));
    try {
      const status = await setNoteRepost(note.id, next);
      setCount(status.repostCount);
    } catch {
      setReposted(!next);
      setCount(previous);
      toast(t("repostFailed"), "error");
    }
  }

  const item =
    "focus-ring flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[14px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800";
  if (!shareable) {
    return (
      <span className={cn(buttonClass, "cursor-not-allowed opacity-40")} title={t("notShareable")} aria-label={t("notShareable")} role="img">
        <NoteGlyph name="repost" className="h-[18px] w-[18px]" />
      </span>
    );
  }
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => (authenticated ? setOpen((v) => !v) : signInWithGoogle())}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-pressed={reposted}
        aria-label={reposted ? t("unrepost") : t("repost")}
        className={cn(buttonClass, reposted && "text-accent-700 dark:text-accent-400")}
      >
        <span key={reposted ? "on" : "off"} className={cn("inline-flex", touched && "subscribe-pop")}>
          <NoteGlyph name="repost" active={reposted} className="h-[18px] w-[18px]" />
        </span>
        {count !== null && count > 0 && (
          <span className="tabular-nums" title={t("repostCount", { count })}>
            {count}
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-9 z-20 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-float dark:border-slate-800 dark:bg-slate-900"
        >
          <button
            type="button"
            role="menuitem"
            onClick={toggle}
            className={cn(item, reposted ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-100")}
          >
            {reposted ? t("unrepost") : t("repost")}
            <NoteGlyph name="repost" className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onQuote();
            }}
            className={cn(item, "text-slate-800 dark:text-slate-100")}
          >
            {t("quoteNote")}
            <Quote className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

export function NoteLengthRing({ length, className }: { length: number; className?: string }) {
  const t = useTranslations("notes");
  if (length === 0) return null;
  const left = NOTE_MAX_LENGTH - length;
  const near = left <= NOTE_RING_NUMBER_FROM;
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, length / NOTE_MAX_LENGTH);
  const label = left < 0 ? t("tooLong", { max: NOTE_MAX_LENGTH }) : t("remaining", { count: left });
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-grid shrink-0 place-items-center transition-[width,height] duration-200 motion-reduce:transition-none",
        near ? "h-7 w-7" : "h-[22px] w-[22px]",
        className,
      )}
    >
      <svg viewBox="0 0 22 22" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <circle cx="11" cy="11" r={radius} fill="none" strokeWidth="2.5" className="stroke-slate-200 dark:stroke-slate-700" />
        <circle
          cx="11"
          cy="11"
          r={radius}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className={cn(
            "transition-[stroke-dashoffset] duration-200 motion-reduce:transition-none",
            left < 0 ? "stroke-red-600 dark:stroke-red-400" : "stroke-accent-600",
          )}
        />
      </svg>
      {near && (
        <span
          aria-hidden
          className={cn(
            "relative text-[10px] font-semibold tabular-nums",
            left < 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400",
          )}
        >
          {left}
        </span>
      )}
    </span>
  );
}

function NoteMenu({
  bookmarked,
  onBookmark,
  onConnect,
  onEdit,
  onDelete,
  pinned,
  onPin,
  disabled,
}: {
  bookmarked: boolean;
  onBookmark: () => void;
  onConnect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  pinned: boolean;
  onPin?: () => void;
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
          className="absolute right-0 top-8 z-20 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-float dark:border-slate-800 dark:bg-slate-900"
        >
          <button
            type="button"
            role="menuitem"
            className={cn(item, "text-slate-700 dark:text-slate-200")}
            onClick={() => {
              setOpen(false);
              onBookmark();
            }}
          >
            {bookmarked ? t("unbookmark") : t("bookmark")}
          </button>
          <button
            type="button"
            role="menuitem"
            className={cn(item, "text-slate-700 dark:text-slate-200")}
            onClick={() => {
              setOpen(false);
              onConnect();
            }}
          >
            {t("connectToCollection")}
          </button>
          {onPin && (
            <button
              type="button"
              role="menuitem"
              className={cn(item, "text-slate-700 dark:text-slate-200")}
              onClick={() => {
                setOpen(false);
                onPin();
              }}
            >
              {pinned ? t("unpin") : t("pin")}
            </button>
          )}
          {onEdit && (
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
          )}
          {onDelete && (
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
          )}
        </div>
      )}
    </div>
  );
}
