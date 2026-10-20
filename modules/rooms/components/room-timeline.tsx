"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MoreHorizontal, UserPlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ErrorState } from "@/components/common/error-state";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { blogCta } from "@/modules/blog/components/blog-cta";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { askToSignIn } from "@/components/auth/login-prompt";
import type { Note } from "@/modules/notes/api/notes";
import { NoteComposer } from "@/modules/notes/components/note-composer";
import { NoteFeedRow, NoteListSkeleton } from "@/modules/notes/components/note-list";
import { getRoom, listRoomNotes, markRoomRead, personName, type RoomDetail } from "@/modules/rooms/api/rooms";
import { dayBreak, type DayBreak } from "@/modules/rooms/lib/room-bands";
import { roomSettingsPath, roomsPath } from "@/modules/rooms/lib/room-href";
import { InsideRoomProvider } from "@/modules/rooms/lib/room-scope";
import { RoomFaces } from "./room-faces";
import { RoomInviteSheet } from "./room-invite-sheet";

type Detail = { kind: "loading" } | { kind: "missing" } | { kind: "failed" } | { kind: "loaded"; room: RoomDetail };

export function memberLine(room: RoomDetail, t: (key: string, values?: Record<string, string | number>) => string) {
  const names = room.members.slice(0, 2).map(personName).join(", ");
  const rest = room.memberCount - Math.min(2, room.members.length);
  return rest > 0 ? t("memberLine", { names, count: rest }) : names;
}

export function RoomTimeline({ roomId }: { roomId: number }) {
  const t = useTranslations("rooms");
  const locale = useLocale();
  const { ready, authenticated } = useAuth();
  const [detail, setDetail] = useState<Detail>({ kind: "loading" });
  const [notes, setNotes] = useState<Note[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [notesState, setNotesState] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [posted, setPosted] = useState<Set<number>>(new Set());
  const [inviting, setInviting] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const read = useRef<number | null>(null);

  const loadDetail = useCallback(() => {
    getRoom(roomId)
      .then((room) => setDetail({ kind: "loaded", room }))
      .catch((error) =>
        setDetail({ kind: error instanceof ApiError && (error.status === 404 || error.status === 403) ? "missing" : "failed" }),
      );
  }, [roomId]);

  const loadFirst = useCallback(() => {
    setNotesState((current) => (current === "ready" ? current : "loading"));
    listRoomNotes(roomId, 0)
      .then((feed) => {
        setNotes(feed.items);
        setPage(0);
        setHasNext(feed.hasNext);
        setNotesState("ready");
      })
      .catch(() => setNotesState("error"));
  }, [roomId]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    loadDetail();
    loadFirst();
  }, [ready, authenticated, loadDetail, loadFirst]);

  useEffect(() => {
    const newest = notes[0]?.id;
    if (notesState !== "ready" || newest === undefined || read.current === newest) return;
    read.current = newest;
    void markRoomRead(roomId, newest).catch(() => undefined);
  }, [notes, notesState, roomId]);

  const more = useCallback(async () => {
    if (loadingMore || !hasNext) return;
    setLoadingMore(true);
    try {
      const feed = await listRoomNotes(roomId, page + 1);
      setNotes((current) => [...current, ...feed.items.filter((n) => !current.some((c) => c.id === n.id))]);
      setPage(feed.page);
      setHasNext(feed.hasNext);
    } finally {
      setLoadingMore(false);
    }
  }, [hasNext, loadingMore, page, roomId]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNext || loadingMore) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void more(), {
      rootMargin: "600px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNext, loadingMore, more]);

  if (ready && !authenticated) {
    return (
      <BlogEmpty
        title={t("signedOut")}
        action={
          <button type="button" onClick={() => askToSignIn("room")} className={blogCta()}>
            {t("signIn")}
          </button>
        }
      />
    );
  }
  if (detail.kind === "missing") {
    return (
      <BlogEmpty
        title={t("roomMissing")}
        action={
          <BlogLink href={roomsPath()} className={blogCta({ variant: "text" })}>
            {t("backToRooms")}
          </BlogLink>
        }
      />
    );
  }
  if (detail.kind === "failed") return <ErrorState title={t("loadFailed")} onRetry={loadDetail} />;
  if (detail.kind === "loading") return <NoteListSkeleton />;

  const room = detail.room;
  const label = (day: DayBreak) =>
    day.kind === "today"
      ? t("today")
      : day.kind === "yesterday"
        ? t("yesterday")
        : new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", weekday: "short" }).format(day.date);

  return (
    <InsideRoomProvider roomId={room.id}>
      <div data-testid="room-timeline" data-room-id={room.id}>
        <div className="flex items-start gap-3">
          <h1 className="min-w-0 flex-1 break-words text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
            {room.name}
          </h1>
          <BlogLink
            href={roomSettingsPath(room.id)}
            aria-label={t("settings")}
            data-room-settings
            className="touch-target focus-ring mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <MoreHorizontal aria-hidden className="h-5 w-5" />
          </BlogLink>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <BlogLink
            href={roomSettingsPath(room.id)}
            data-room-members
            aria-label={t("membersLabel", { count: room.memberCount })}
            className="focus-ring flex min-w-0 items-center gap-2.5 rounded"
          >
            <RoomFaces people={room.members} limit={5} size="sm" />
            <span className="min-w-0 truncate text-[13px] text-slate-500 dark:text-slate-400">{memberLine(room, t)}</span>
          </BlogLink>
          <span className="ml-auto" />
          <button
            type="button"
            onClick={() => setInviting(true)}
            data-room-invite
            className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <UserPlus aria-hidden className="h-4 w-4" />
            {t("invite")}
          </button>
        </div>
        <div className="mt-3 border-b border-slate-100 dark:border-slate-800">
          <NoteComposer
            room={{ id: room.id, name: room.name }}
            onCreated={(note) => {
              setNotes((current) => [note, ...current]);
              setPosted((current) => new Set(current).add(note.id));
            }}
          />
        </div>
        {notesState === "loading" && notes.length === 0 ? (
          <NoteListSkeleton />
        ) : notesState === "error" && notes.length === 0 ? (
          <div className="mt-6">
            <ErrorState title={t("loadFailed")} onRetry={loadFirst} />
          </div>
        ) : notes.length === 0 ? (
          <BlogEmpty
            title={t("emptyRoom")}
            action={
              <button type="button" onClick={() => setInviting(true)} className={blogCta({ variant: "secondary" })}>
                {t("inviteAction")}
              </button>
            }
          />
        ) : (
          <div data-room-notes>
            {notes.map((note, index) => {
              const day = dayBreak(notes, index);
              return (
                <Fragment key={note.id}>
                  {day && (
                    <RailHeading className={index === 0 ? "pt-5" : "border-t border-slate-100 pt-6 dark:border-slate-800"}>
                      <span data-room-day>{label(day)}</span>
                    </RailHeading>
                  )}
                  <div className={day ? undefined : "border-t border-slate-100 dark:border-slate-800"}>
                    <NoteFeedRow
                      note={note}
                      isNew={posted.has(note.id)}
                      onReplace={(next) => setNotes((current) => current.map((n) => (n.id === next.id ? next : n)))}
                      onRemove={(id) => setNotes((current) => current.filter((n) => n.id !== id))}
                    />
                  </div>
                </Fragment>
              );
            })}
            {hasNext && (
              <div ref={sentinel} role="status" aria-live="polite" className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => void more()}
                  disabled={loadingMore}
                  data-room-more-notes
                  className="focus-ring inline-flex items-center gap-2 rounded-surface border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50"
                >
                  {loadingMore && <Loader2 aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
                  {t("more")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <RoomInviteSheet
        open={inviting}
        roomId={room.id}
        roomName={room.name}
        memberIds={room.members.map((m) => m.id)}
        onClose={() => setInviting(false)}
      />
    </InsideRoomProvider>
  );
}
