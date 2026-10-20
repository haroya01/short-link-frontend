"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/common/error-state";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { BlogLink } from "@/modules/blog/components/blog-link";
import type { Note } from "@/modules/notes/api/notes";
import { NoteFeedRow, NoteListSkeleton } from "@/modules/notes/components/note-list";
import { listRoomsFeed, markRoomRead } from "@/modules/rooms/api/rooms";
import { roomPath } from "@/modules/rooms/lib/room-href";
import { InsideRoomProvider } from "@/modules/rooms/lib/room-scope";
import { noteSeen, readTargets, roomLineBreaks } from "@/modules/rooms/lib/rooms-view";

const READ_AFTER_MS = 800;

export interface RoomsAllHandle {
  flush: () => Promise<void>;
}

function RoomLine({ note }: { note: Note }) {
  const t = useTranslations("notes");
  if (!note.room) return null;
  return (
    <p className="-mt-1 mb-1.5 flex items-center gap-3 text-[13px] font-medium text-slate-500 dark:text-slate-400">
      <span aria-hidden className="w-9 shrink-0" />
      <BlogLink
        href={roomPath(note.room.id)}
        data-note-room={note.id}
        className="focus-ring min-w-0 truncate rounded hover:text-slate-800 hover:underline dark:hover:text-slate-200"
      >
        {t("fromRoom", { room: note.room.name })}
      </BlogLink>
    </p>
  );
}

export const RoomsAll = forwardRef<RoomsAllHandle, { empty: boolean }>(function RoomsAll({ empty }, ref) {
  const t = useTranslations("rooms");
  const [notes, setNotes] = useState<Note[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const seen = useRef(new Map<number, number>());
  const sent = useRef(new Map<number, number>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const byId = useRef(new Map<number, Note>());

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    list.current?.querySelectorAll<HTMLElement>("[data-rooms-all-note]").forEach((el) => {
      const box = el.getBoundingClientRect();
      const note = byId.current.get(Number(el.dataset.roomsAllNote));
      if (note && box.bottom > 0 && box.top < window.innerHeight) seen.current = noteSeen(seen.current, note);
    });
    const targets = readTargets(seen.current, sent.current);
    targets.forEach(({ roomId, noteId }) => sent.current.set(roomId, noteId));
    await Promise.all(targets.map(({ roomId, noteId }) => markRoomRead(roomId, noteId).catch(() => undefined)));
  }, []);

  useImperativeHandle(ref, () => ({ flush }), [flush]);

  const load = useCallback(() => {
    setState("loading");
    listRoomsFeed(0, 20)
      .then((feed) => {
        setNotes(feed.items);
        setPage(0);
        setHasNext(feed.hasNext);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(load, [load]);
  useEffect(() => () => void flush(), [flush]);

  useEffect(() => {
    byId.current = new Map(notes.map((n) => [n.id, n]));
  }, [notes]);

  useEffect(() => {
    const root = list.current;
    if (!root || notes.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        let next = seen.current;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const note = byId.current.get(Number((entry.target as HTMLElement).dataset.roomsAllNote));
          if (note) next = noteSeen(next, note);
        }
        if (next === seen.current) return;
        seen.current = next;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void flush(), READ_AFTER_MS);
      },
      { threshold: 0.6 },
    );
    root.querySelectorAll("[data-rooms-all-note]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [notes, flush]);

  const more = useCallback(async () => {
    if (loadingMore || !hasNext) return;
    setLoadingMore(true);
    try {
      const feed = await listRoomsFeed(page + 1, 20);
      setNotes((current) => [...current, ...feed.items.filter((n) => !current.some((c) => c.id === n.id))]);
      setPage(feed.page);
      setHasNext(feed.hasNext);
    } finally {
      setLoadingMore(false);
    }
  }, [hasNext, loadingMore, page]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNext || loadingMore) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void more(), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNext, loadingMore, more]);

  if (state === "loading" && notes.length === 0) return <NoteListSkeleton />;
  if (state === "error" && notes.length === 0) {
    return (
      <div className="mt-6">
        <ErrorState title={t("loadFailed")} onRetry={load} />
      </div>
    );
  }
  if (notes.length === 0) return empty ? null : <BlogEmpty title={t("allEmpty")} />;

  const breaks = roomLineBreaks(notes);
  return (
    <div data-testid="rooms-all">
      <div ref={list} className="divide-y divide-slate-100 dark:divide-slate-800">
        {notes.map((note, i) => (
          <div key={note.id} data-rooms-all-note={note.id}>
            <InsideRoomProvider roomId={note.room?.id ?? -1}>
              <NoteFeedRow
                note={note}
                context={breaks[i] ? <RoomLine note={note} /> : undefined}
                onReplace={(next) => setNotes((current) => current.map((n) => (n.id === next.id ? next : n)))}
                onRemove={(id) => setNotes((current) => current.filter((n) => n.id !== id))}
              />
            </InsideRoomProvider>
          </div>
        ))}
      </div>
      {hasNext && (
        <div ref={sentinel} role="status" aria-live="polite" className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => void more()}
            disabled={loadingMore}
            data-rooms-all-more
            className="focus-ring inline-flex items-center gap-2 rounded-surface border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50"
          >
            {loadingMore && <Loader2 aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
            {t("more")}
          </button>
        </div>
      )}
    </div>
  );
});
