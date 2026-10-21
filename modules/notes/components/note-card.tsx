"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, MoreHorizontal, NotebookPen, Pin, Quote, Share } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { askToSignIn } from "@/components/auth/login-prompt";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/use-confirm";
import { useToast } from "@/components/ui/toast";
import { useLikeFailed } from "@/hooks/use-like-failed";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { AuthorName, STRONG_NAME } from "@/modules/blog/components/author-name";
import { blogHref, blogPath } from "@/lib/host";
import { authorHref } from "@/modules/blog/lib/author-href";
import { contentLang } from "@/modules/blog/lib/content-lang";
import { useCompactTime } from "@/modules/notes/lib/use-compact-time";
import {
  deleteNote,
  editNote,
  NOTE_MAX_LENGTH,
  NOTE_MAX_WARNING_LENGTH,
  setNoteBookmark,
  setConversationMuted,
  setNoteLike,
  setNotePin,
  isShareable,
  setNoteRepost,
  type Note,
} from "@/modules/notes/api/notes";
import { noteLength } from "@/modules/notes/lib/note-text";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { NoteBody } from "./note-body";
import { NoteReplyDialog } from "./note-reply-dialog";
import { TextToggle } from "./note-composer";
import { NoteMedia } from "./note-media";
import { NotePollCard } from "./note-poll";
import { NoteGlyph } from "./note-glyph";
import { NoteHistoryDialog } from "./note-history-dialog";
import { VisibilityIcon } from "./note-visibility";
import { NoteLinkCard } from "./note-link-card";
import { NoteRemoteCard, remoteCardOf, webAddress } from "./note-remote-card";
import { NoteQuoteDialog } from "./note-quote-dialog";
import { NoteSeriesDialog } from "./note-series-dialog";
import { QuotedNoteCard } from "./quoted-note-card";
import { QuotedPostCard } from "./quoted-post-card";
import { ConnectSheet } from "@/modules/blog/components/connect-sheet";
import { ReportButton } from "@/modules/blog/components/report-button";
import { noteHref, openNote } from "@/modules/notes/lib/note-href";
import { ReplyPolicyDialog, replyRestrictedKey } from "./note-reply-policy";
import { roomPath } from "@/modules/rooms/lib/room-href";
import { useInsideRoom } from "@/modules/rooms/lib/room-scope";

const NOTE_RING_NUMBER_FROM = 20;

/** A member's notes on their blog, or an account on another server on its remote page. */
export function noteAuthorHref(author: Note["author"], locale: string): string {
  return author.remoteId ? blogPath(`/remote/${author.remoteId}`) : authorHref(author.username, locale);
}

const FEDERATION_HOST = process.env.NEXT_PUBLIC_KURL_HOST ?? "kurl.me";

export const NOTE_ACTION =
  "touch-target inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-slate-700 transition-colors hover:bg-slate-100 focus-ring dark:text-slate-300 dark:hover:bg-slate-800";

export interface DetachedNote {
  authorHref: string | null;
  onAuthor: () => void;
  onOpen: () => void;
  menu: React.ReactNode;
  footer: React.ReactNode;
  openHref?: string;
  content?: React.ReactNode;
}

export function NoteCard({
  note,
  onChange,
  onDelete,
  onQuoted,
  emphasis = false,
  isNew = false,
  arrive = false,
  repostedBy,
  showsPin = false,
  filteredBy,
  position,
  replyModeration,
  context,
  onReplied,
  detached,
}: {
  note: Note;
  onChange?: (note: Note) => void;
  onDelete?: (id: number) => void;
  onQuoted?: (note: Note) => void;
  emphasis?: boolean;
  isNew?: boolean;
  arrive?: boolean;
  repostedBy?: string;
  /** Only the author's profile marks pins; on Mastodon a pin means nothing anywhere else. */
  showsPin?: boolean;
  filteredBy?: string[];
  /** Which part of a thread written in parts ("1/3"), shown at the end of the header as on Threads. */
  position?: string;
  /** The reader wrote the thread's first note and this is someone else's reply in it. */
  replyModeration?: { hidden: boolean; onToggleHidden: () => void; onRemove: () => void };
  /** A line above the header saying where this note sits (the profile replies tab's "@x 님에게 답글"). */
  context?: React.ReactNode;
  /** The page shows the new reply itself; without it the card counts it and offers a way to it. */
  onReplied?: (reply: Note) => void;
  detached?: DetachedNote;
}) {
  const t = useTranslations("notes");
  const locale = useLocale();
  const ago = useCompactTime();
  const router = useRouter();
  const { authenticated, me } = useAuth();
  const [confirm, confirmDialog] = useConfirm();
  const { toast } = useToast();
  const likeFailed = useLikeFailed();
  const mine = me?.id === note.author.id;
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [mediaShown, setMediaShown] = useState(false);
  const [showingHistory, setShowingHistory] = useState(false);
  const [filterOpened, setFilterOpened] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [warns, setWarns] = useState(false);
  const [warning, setWarning] = useState("");
  const [sensitive, setSensitive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [liked, setLiked] = useState(note.likedByMe === true);
  const [likeCount, setLikeCount] = useState(note.likeCount);
  const [likeTouched, setLikeTouched] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [addingToSeries, setAddingToSeries] = useState(false);
  const [bookmarked, setBookmarked] = useState(note.bookmarkedByMe === true);
  const [conversationMuted, setConversationMutedState] = useState(note.conversationMuted === true);
  const [choosingReplyPolicy, setChoosingReplyPolicy] = useState(false);
  const [replying, setReplying] = useState(false);
  const replyClosed = authenticated && note.canReply === false;
  const setsReplyPolicy =
    mine && note.inReplyToId === null && !note.author.remoteId && note.replyPolicy !== undefined;
  const tCollections = useTranslations("collections");
  const insideRoom = useInsideRoom();
  const inRoom = note.room ?? null;
  const roomLine = inRoom && insideRoom !== inRoom.id ? inRoom : null;

  useEffect(() => {
    setLiked(note.likedByMe === true);
    setLikeCount(note.likeCount);
  }, [note.likedByMe, note.likeCount]);

  useEffect(() => {
    setBookmarked(note.bookmarkedByMe === true);
  }, [note.bookmarkedByMe]);

  useEffect(() => {
    setConversationMutedState(note.conversationMuted === true);
  }, [note.conversationMuted]);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(note.body);
      toast(t("textCopied"));
    } catch {
      toast(t("textCopyFailed"), "error");
    }
  }

  async function toggleConversationMute() {
    const next = !conversationMuted;
    setConversationMutedState(next);
    try {
      await setConversationMuted(note.id, next);
      toast(next ? t("conversationMuted") : t("conversationUnmuted"));
    } catch {
      setConversationMutedState(!next);
      toast(t("conversationMuteFailed"), "error");
    }
  }

  async function toggleBookmark() {
    if (!authenticated) {
      askToSignIn("bookmark");
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
      askToSignIn("like");
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
    } catch (error) {
      setLiked(!next);
      setLikeCount(previous);
      likeFailed(error);
    }
  }

  function startEditing() {
    setDraft(note.body);
    setWarns(note.contentWarning != null);
    setWarning(note.contentWarning ?? "");
    setSensitive(note.sensitive === true);
    setEditing(true);
  }

  async function save() {
    if (busy || noteLength(draft) > NOTE_MAX_LENGTH) return;
    setBusy(true);
    try {
      const saved = await editNote(note.id, {
        body: draft,
        contentWarning: warns ? warning.trim() : "",
        sensitive: note.media.length > 0 && sensitive,
      });
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

  async function removeReply() {
    const ok = await confirm({
      title: t("removeReplyConfirm"),
      description: t("removeReplyHint"),
      confirmLabel: t("removeReply"),
      destructive: true,
    });
    if (ok) replyModeration?.onRemove();
  }

  function startReply() {
    if (!authenticated) {
      askToSignIn("reply");
      return;
    }
    if (!replyClosed) setReplying(true);
  }

  function replied(reply: Note) {
    setReplying(false);
    if (onReplied) {
      onReplied(reply);
      return;
    }
    onChange?.({ ...note, replyCount: note.replyCount + 1 });
    toast(t("replyPosted"), "default", {
      action: { label: t("view"), onClick: () => openNote(reply, locale, router.push) },
    });
  }

  function reveal() {
    setRevealed(true);
  }

  function openFromBody(e: React.MouseEvent<HTMLDivElement>) {
    if (emphasis || editing) return;
    if ((e.target as HTMLElement).closest("a, button, textarea, video, audio, [role='menu']")) return;
    if (window.getSelection()?.toString()) return;
    if (detached) {
      if (e.button === 0) detached.onOpen();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
      window.open(noteHref(note, locale), "_blank", "noopener");
      return;
    }
    if (e.button !== 0) return;
    openNote(note, locale, router.push);
  }

  const overLimit = noteLength(draft) > NOTE_MAX_LENGTH;
  const action = NOTE_ACTION;

  if (filteredBy?.length && !filterOpened) {
    return (
      <article data-note-id={detached ? undefined : note.id} data-note-filtered>
        <button
          type="button"
          onClick={() => setFilterOpened(true)}
          className="focus-ring flex w-full items-baseline gap-1.5 rounded-surface py-3.5 text-left text-[13px]"
        >
          <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">
            {t("filteredBy", { phrases: filteredBy.join(", ") })}
          </span>
          <span className="shrink-0 font-medium text-slate-900 dark:text-slate-100">{t("showFiltered")}</span>
        </button>
      </article>
    );
  }

  const folded = Boolean(note.contentWarning) && !revealed && !editing;
  const mediaConcealed =
    note.media.length > 0 && (note.contentWarning ? !revealed && !editing : note.sensitive === true && !mediaShown);
  const remoteCard = remoteCardOf(note);
  const authorHref = detached ? detached.authorHref : noteAuthorHref(note.author, locale);
  const avatar = (
    <Avatar
      src={note.author.avatarUrl}
      name={note.author.displayName || note.author.username}
      handle={note.author.username}
      size={emphasis ? "lg" : "md"}
    />
  );
  const stampClass =
    "shrink-0 rounded text-slate-500 transition-colors hover:text-slate-800 focus-ring dark:text-slate-400 dark:hover:text-slate-200";
  const stamp = (
    <>
      <time dateTime={note.createdAt} suppressHydrationWarning>
        {ago(note.createdAt)}
      </time>
      {note.editedAt && <span> · {t("edited")}</span>}
    </>
  );

  return (
    <article
      className={cn("py-4", emphasis && "py-5", isNew && "comment-in", arrive && "note-arrive")}
      data-note-id={detached ? undefined : note.id}
    >
      {repostedBy && (
        <p className="-mt-1 mb-1.5 flex items-center gap-3 text-[13px] font-medium text-slate-500 dark:text-slate-400">
          <span className="flex w-9 shrink-0 justify-end">
            <NoteGlyph name="repost" className="h-3.5 w-3.5" />
          </span>
          <span className="truncate">{t("repostedBy", { username: repostedBy })}</span>
        </p>
      )}
      {!repostedBy && roomLine && (
        <p className="-mt-1 mb-1.5 flex items-center gap-3 text-[13px] font-medium text-slate-500 dark:text-slate-400">
          <span aria-hidden className="w-9 shrink-0" />
          <BlogLink
            href={roomPath(roomLine.id)}
            data-note-room={note.id}
            className="focus-ring min-w-0 truncate rounded hover:text-slate-800 hover:underline dark:hover:text-slate-200"
          >
            {t("fromRoom", { room: roomLine.name })}
          </BlogLink>
        </p>
      )}
      {context}
      {!repostedBy && !roomLine && !context && showsPin && note.pinned && (
        <p className="-mt-1 mb-1.5 flex items-center gap-3 text-[13px] font-medium text-slate-500 dark:text-slate-400">
          <span className="flex w-9 shrink-0 justify-end">
            <Pin className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span>{t("pinnedLabel")}</span>
        </p>
      )}
      <div className={emphasis ? "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3" : "flex gap-3"}>
        {authorHref ? (
          <BlogLink href={authorHref} tabIndex={-1} aria-hidden className="shrink-0 self-start rounded-full">
            {avatar}
          </BlogLink>
        ) : (
          <button
            type="button"
            onClick={detached?.onAuthor}
            tabIndex={-1}
            aria-hidden
            className="shrink-0 self-start rounded-full"
          >
            {avatar}
          </button>
        )}
        <div className={emphasis ? "contents" : "min-w-0 flex-1"}>
          <header className="flex min-h-5 items-center gap-1.5 text-[15px] leading-5">
            {emphasis ? (
              <div className="min-w-0">
                <BlogLink
                  href={noteAuthorHref(note.author, locale)}
                  className="block truncate rounded font-semibold text-slate-900 hover:underline focus-ring dark:text-slate-100"
                >
                  {note.author.displayName || note.author.username}
                </BlogLink>
                <span className="block truncate text-[13px] text-slate-500 dark:text-slate-400">
                  {note.author.remoteId ? `@${note.author.username}` : `@${note.author.username}@${FEDERATION_HOST}`}
                </span>
              </div>
            ) : authorHref ? (
              <BlogLink href={authorHref} className="flex min-w-0 rounded focus-ring hover:underline">
                <AuthorName name={note.author.displayName} handle={note.author.username} className={STRONG_NAME} />
              </BlogLink>
            ) : (
              <button
                type="button"
                onClick={detached?.onAuthor}
                className="flex min-w-0 rounded text-left focus-ring hover:underline"
              >
                <AuthorName name={note.author.displayName} handle={note.author.username} className={STRONG_NAME} />
              </button>
            )}
            {!emphasis && (
              <span aria-hidden className="shrink-0 text-slate-400 dark:text-slate-500">
                ·
              </span>
            )}
            {!emphasis &&
              (detached && !detached.openHref ? (
                <button type="button" onClick={detached.onOpen} className={stampClass}>
                  {stamp}
                </button>
              ) : detached?.openHref ? (
                <BlogLink href={detached.openHref} className={stampClass}>
                  {stamp}
                </BlogLink>
              ) : (
                <BlogLink href={noteHref(note, locale)} className={stampClass}>
                  {stamp}
                </BlogLink>
              ))}
            {note.visibility && note.visibility !== "public" && !(inRoom && insideRoom === inRoom.id) && (
              <VisibilityIcon
                visibility={note.visibility}
                label={inRoom ? t("roomMembersOnly", { room: inRoom.name }) : t(`visibilityShort.${note.visibility}`)}
                className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400"
              />
            )}
            <div className="-my-2 ml-auto flex shrink-0 items-center gap-2">
              {position && (
                <span
                  data-testid={`note-position-${note.id}`}
                  aria-label={t("threadPosition", { position })}
                  className="text-[13px] tabular-nums text-slate-500 dark:text-slate-400"
                >
                  {position}
                </span>
              )}
              {emphasis && !note.author.remoteId && (
                <FollowButton username={note.author.username} initialFollowerCount={0} compact quiet />
              )}
              {detached?.menu}
              {!detached && authenticated && !editing && (
                <NoteMenu
                  onCopy={note.body ? copyText : undefined}
                  bookmarked={bookmarked}
                  onBookmark={toggleBookmark}
                  conversationMuted={conversationMuted}
                  onConversationMute={toggleConversationMute}
                  onConnect={inRoom ? undefined : () => setConnecting(true)}
                  onReport={!mine && !emphasis ? () => setReporting(true) : undefined}
                  onEdit={mine ? startEditing : undefined}
                  onDelete={mine ? remove : undefined}
                  pinned={note.pinned === true}
                  onPin={mine && note.inReplyToId === null ? togglePin : undefined}
                  onAddToSeries={
                    mine && !note.author.remoteId && isShareable(note.visibility)
                      ? () => setAddingToSeries(true)
                      : undefined
                  }
                  onReplyPolicy={setsReplyPolicy ? () => setChoosingReplyPolicy(true) : undefined}
                  replyHidden={replyModeration?.hidden}
                  onToggleReplyHidden={replyModeration?.onToggleHidden}
                  onRemoveReply={replyModeration ? removeReply : undefined}
                  disabled={busy}
                />
              )}
            </div>
          </header>

          {emphasis && note.hidden && (
            <p data-testid="note-hidden-reply" className="col-span-2 mt-3 text-[13px] text-slate-500 dark:text-slate-400">
              {t("hiddenReplyNotice")}
            </p>
          )}
          <div
            className={emphasis ? "col-span-2 mt-3" : "cursor-pointer"}
            onClick={openFromBody}
            onAuxClick={openFromBody}
            data-note-body
          >
            {note.contentWarning && !editing && (
              <p
                data-note-warning
                lang={contentLang(note.contentWarning, note.language)}
                className={cn(
                  "whitespace-pre-wrap break-words leading-[1.45] text-slate-900 dark:text-slate-100",
                  emphasis ? "text-[17px]" : "mt-1 text-[15px]",
                )}
              >
                {note.contentWarning}
              </p>
            )}
            <div className={emphasis ? (note.contentWarning && !editing ? "mt-1" : undefined) : "mt-1"}>
              {folded ? (
                note.body && (
                  <button
                    type="button"
                    onClick={reveal}
                    aria-label={t("concealedShow")}
                    data-note-reveal
                    className="focus-ring block w-full cursor-pointer rounded-surface text-left"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "block select-none whitespace-pre-wrap break-words leading-[1.45] text-slate-800 blur-[6px] dark:text-slate-200",
                        emphasis ? "text-[17px]" : "text-[15px]",
                      )}
                    >
                      {note.body}
                    </span>
                  </button>
                )
              ) : editing ? (
                <div>
                  {warns && (
                    <input
                      value={warning}
                      onChange={(e) => setWarning(e.target.value)}
                      maxLength={NOTE_MAX_WARNING_LENGTH}
                      placeholder={t("warningPlaceholder")}
                      aria-label={t("warningLabel")}
                      className="focus-ring mb-1.5 w-full rounded-surface bg-slate-100 px-3 py-1.5 text-[15px] font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  )}
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    autoFocus
                    aria-label={t("edit")}
                    className="focus-ring max-h-[60vh] min-h-[4.5lh] w-full resize-none rounded-surface border border-slate-300 bg-white px-3 py-2 text-[15px] leading-relaxed text-slate-900 [field-sizing:content] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <div className="-ml-1.5 mr-auto flex items-center gap-1">
                      <TextToggle pressed={warns} onToggle={() => setWarns((on) => !on)}>
                        {t("warningToggle")}
                      </TextToggle>
                      {note.media.length > 0 && !warns && (
                        <TextToggle pressed={sensitive} onToggle={() => setSensitive((on) => !on)}>
                          {t("sensitiveToggle")}
                        </TextToggle>
                      )}
                    </div>
                    <NoteLengthRing length={noteLength(draft)} />
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
                <div className={revealed ? "animate-fade-in motion-reduce:animate-none" : undefined}>
                  {detached?.content ? (
                    detached.content
                  ) : remoteCard ? (
                    <NoteRemoteCard
                      shape={remoteCard}
                      summary={note.body}
                      picture={mediaConcealed ? null : (note.media.find((m) => m.contentType.startsWith("image/")) ?? null)}
                      language={note.language}
                      full={emphasis}
                    />
                  ) : (
                    <NoteBody body={note.body} mentions={note.mentions} large={emphasis} language={note.language} />
                  )}
                </div>
              )}
            </div>
            {!folded && note.poll && (
              <NotePollCard
                noteId={note.id}
                poll={note.poll}
                onVoted={(poll) => onChange?.({ ...note, poll })}
                elsewhere={
                  note.author.remoteId || detached ? { url: webAddress(note.remote?.url)?.href ?? null } : undefined
                }
              />
            )}
            <NoteMedia
              media={remoteCard && !mediaConcealed ? [] : note.media}
              concealed={mediaConcealed}
              onReveal={() => (note.contentWarning ? reveal() : setMediaShown(true))}
            />
            {!folded && (
              <div className={revealed ? "animate-fade-in motion-reduce:animate-none" : undefined}>
                {note.quotedPost && <QuotedPostCard post={note.quotedPost} />}
                {note.quotedNote && <QuotedNoteCard note={note.quotedNote} />}
                {note.linkPreview && <NoteLinkCard preview={note.linkPreview} />}
              </div>
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

            {detached ? (
              <footer className="-mb-1 -ml-2 mt-1 flex items-center gap-1.5 text-[13px]">{detached.footer}</footer>
            ) : (
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
                <button
                  type="button"
                  onClick={startReply}
                  disabled={replyClosed}
                  title={replyClosed ? t(replyRestrictedKey(note.replyPolicy)) : undefined}
                  data-note-reply={note.id}
                  className={cn(action, "disabled:cursor-not-allowed disabled:opacity-40")}
                >
                  <NoteGlyph name="reply" className="h-[18px] w-[18px]" />
                  <span className="sr-only">{t("replyLabel")} </span>
                  {note.replyCount > 0 && <span className="tabular-nums">{note.replyCount}</span>}
                </button>
                {!inRoom && <RepostControl note={note} buttonClass={action} onQuote={() => setQuoting(true)} />}
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
                {!inRoom && <ShareControl note={note} buttonClass={action} />}
                {emphasis && !mine && (
                  <span className="ml-auto">
                    <ReportButton
                      subjectType="NOTE"
                      subjectId={note.id}
                      forwardDomain={note.author.remoteId ? note.author.username.split("@").pop() : undefined}
                    />
                  </span>
                )}
              </footer>
            )}
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
      {!mine && !emphasis && (
        <ReportButton
          subjectType="NOTE"
          subjectId={note.id}
          forwardDomain={note.author.remoteId ? note.author.username.split("@").pop() : undefined}
          open={reporting}
          onOpenChange={setReporting}
          layerClassName="z-[70]"
        />
      )}
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
      {mine && (
        <NoteSeriesDialog noteId={note.id} open={addingToSeries} onClose={() => setAddingToSeries(false)} />
      )}
      {setsReplyPolicy && (
        <ReplyPolicyDialog
          noteId={note.id}
          current={note.replyPolicy ?? "everyone"}
          open={choosingReplyPolicy}
          onClose={() => setChoosingReplyPolicy(false)}
          onSaved={(replyPolicy) => onChange?.({ ...note, replyPolicy })}
        />
      )}
      <NoteReplyDialog target={replying ? note : null} onClose={() => setReplying(false)} onReplied={replied} />
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

export function RepostControl({
  note,
  buttonClass,
  onQuote,
  resolve,
}: {
  note: Note;
  buttonClass: string;
  onQuote: () => void;
  resolve?: () => Promise<Note | null>;
}) {
  const t = useTranslations("notes");
  const { authenticated } = useAuth();
  const { toast } = useToast();
  const shareable = isShareable(note.visibility);
  const [reposted, setReposted] = useState(note.repostedByMe === true);
  const [count, setCount] = useState(note.repostCount ?? null);
  const [touched, setTouched] = useState(false);
  const resolved = useRef(false);
  const { open, setOpen, root } = usePopoverMenu();

  useEffect(() => {
    setReposted(note.repostedByMe === true);
    setCount(note.repostCount ?? null);
  }, [note.repostedByMe, note.repostCount]);

  async function toggle() {
    setOpen(false);
    const next = !reposted;
    const previous = count;
    setTouched(true);
    setReposted(next);
    setCount(Math.max((count ?? 0) + (next ? 1 : -1), 0));
    try {
      const first = resolve !== undefined && !resolved.current;
      const target = resolve ? await resolve() : note;
      if (!target) {
        setReposted(!next);
        setCount(previous);
        return;
      }
      resolved.current = true;
      if (first && next && target.repostedByMe === true) {
        setCount(previous);
        return;
      }
      const status = await setNoteRepost(target.id, next);
      setCount(status.repostCount);
    } catch {
      setReposted(!next);
      setCount(previous);
      toast(t("repostFailed"), "error");
    }
  }

  const item =
    "focus-ring flex w-full items-center justify-between gap-3 rounded-surface px-3 py-2 text-left text-[14px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800";
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
        onClick={() => (authenticated ? setOpen((v) => !v) : askToSignIn("repost"))}
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
          className="absolute left-0 top-9 z-20 w-48 rounded-surface border border-slate-200 bg-white p-1 shadow-float dark:border-slate-800 dark:bg-slate-900"
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

function usePopoverMenu() {
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
  return { open, setOpen, root };
}

/** Quoting in a blog post is offered only for notes anyone may see: readers of the post fetch the card
 *  anonymously, so a private note's card would come up empty. */
function ShareControl({ note, buttonClass }: { note: Note; buttonClass: string }) {
  const locale = useLocale();
  return <ShareMenu href={noteHref(note, locale)} buttonClass={buttonClass} quotable={isShareable(note.visibility)} />;
}

export function ShareMenu({ href, buttonClass, quotable = false }: { href: string; buttonClass: string; quotable?: boolean }) {
  const t = useTranslations("notes");
  const { toast } = useToast();
  const { authenticated } = useAuth();
  const { open, setOpen, root } = usePopoverMenu();
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
  }, []);

  const url = () => new URL(href, window.location.href).toString();

  async function copy() {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(url());
      toast(t("linkCopied"));
    } catch {
      toast(t("linkCopyFailed"), "error");
    }
  }

  async function shareVia() {
    setOpen(false);
    try {
      await navigator.share({ url: url() });
    } catch {
      return;
    }
  }

  function quoteInPost() {
    setOpen(false);
    if (!authenticated) {
      askToSignIn("quote");
      return;
    }
    window.location.assign(blogHref(`/write/new?quote=${encodeURIComponent(url())}`));
  }

  const item =
    "focus-ring flex w-full items-center justify-between gap-3 rounded-surface px-3 py-2 text-left text-[14px] font-medium text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800";
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("share")}
        className={buttonClass}
      >
        <NoteGlyph name="share" className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-20 w-52 rounded-surface border border-slate-200 bg-white p-1 shadow-float dark:border-slate-800 dark:bg-slate-900"
        >
          <button type="button" role="menuitem" onClick={copy} className={item}>
            {t("copyLink")}
            <Link2 className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          </button>
          {canShare && (
            <button type="button" role="menuitem" onClick={shareVia} className={item}>
              {t("shareVia")}
              <Share className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            </button>
          )}
          {quotable && (
            <button type="button" role="menuitem" onClick={quoteInPost} className={item}>
              {t("quoteInPost")}
              <NotebookPen className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            </button>
          )}
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
  onCopy,
  conversationMuted,
  onConversationMute,
  onConnect,
  onReport,
  onEdit,
  onDelete,
  pinned,
  onPin,
  onAddToSeries,
  onReplyPolicy,
  replyHidden,
  onToggleReplyHidden,
  onRemoveReply,
  disabled,
}: {
  bookmarked: boolean;
  onBookmark: () => void;
  conversationMuted: boolean;
  onConversationMute: () => void;
  onConnect?: () => void;
  onCopy?: () => void;
  onReport?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  pinned: boolean;
  onPin?: () => void;
  onAddToSeries?: () => void;
  onReplyPolicy?: () => void;
  replyHidden?: boolean;
  onToggleReplyHidden?: () => void;
  onRemoveReply?: () => void;
  disabled: boolean;
}) {
  const t = useTranslations("notes");
  const tp = useTranslations("publicPost");
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
    "focus-ring block w-full rounded-surface px-3 py-2 text-left text-[13px] hover:bg-slate-100 dark:hover:bg-slate-800";
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
          className="absolute right-0 top-8 z-20 w-40 rounded-surface border border-slate-200 bg-white p-1 shadow-float dark:border-slate-800 dark:bg-slate-900"
        >
          {onCopy && (
            <button
              type="button"
              role="menuitem"
              className={cn(item, "text-slate-700 dark:text-slate-200")}
              onClick={() => {
                setOpen(false);
                onCopy();
              }}
            >
              {t("copyText")}
            </button>
          )}
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
          {onConnect && (
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
          )}
          <button
            type="button"
            role="menuitem"
            className={cn(item, "text-slate-700 dark:text-slate-200")}
            onClick={() => {
              setOpen(false);
              onConversationMute();
            }}
          >
            {conversationMuted ? t("unmuteConversation") : t("muteConversation")}
          </button>
          {onReport && (
            <button
              type="button"
              role="menuitem"
              className={cn(item, "text-red-600 dark:text-red-400")}
              onClick={() => {
                setOpen(false);
                onReport();
              }}
            >
              {tp("report")}
            </button>
          )}
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
          {onAddToSeries && (
            <button
              type="button"
              role="menuitem"
              className={cn(item, "text-slate-700 dark:text-slate-200")}
              onClick={() => {
                setOpen(false);
                onAddToSeries();
              }}
            >
              {t("addToSeries")}
            </button>
          )}
          {onReplyPolicy && (
            <button
              type="button"
              role="menuitem"
              className={cn(item, "text-slate-700 dark:text-slate-200")}
              onClick={() => {
                setOpen(false);
                onReplyPolicy();
              }}
            >
              {t("replyPolicyLabel")}
            </button>
          )}
          {onToggleReplyHidden && (
            <button
              type="button"
              role="menuitem"
              className={cn(item, "text-slate-700 dark:text-slate-200")}
              onClick={() => {
                setOpen(false);
                onToggleReplyHidden();
              }}
            >
              {replyHidden ? t("unhideReply") : t("hideReply")}
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
          {onRemoveReply && (
            <button
              type="button"
              role="menuitem"
              className={cn(item, "text-red-600 dark:text-red-400")}
              onClick={() => {
                setOpen(false);
                onRemoveReply();
              }}
            >
              {t("removeReply")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
