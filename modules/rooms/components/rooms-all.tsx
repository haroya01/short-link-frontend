"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/common/error-state";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { BlogLink } from "@/modules/blog/components/blog-link";
import type { Note } from "@/modules/notes/api/notes";
import { NoteListSkeleton } from "@/modules/notes/components/note-list";
import { listAllRoomItems, markRoomRead, type RoomItem } from "@/modules/rooms/api/rooms";
import { itemKey, itemRoomId } from "@/modules/rooms/lib/room-items";
import { roomPath } from "@/modules/rooms/lib/room-href";
import { InsideRoomProvider } from "@/modules/rooms/lib/room-scope";
import { noteSeen, readTargets, roomLineBreaks } from "@/modules/rooms/lib/rooms-view";
import { RoomItemRow } from "./room-item-row";

const READ_AFTER_MS = 800;

function seenNote(item: RoomItem | undefined): Note | null {
  return item?.kind === "note" ? item.note : null;
}

export interface RoomsAllHandle {
  flush: () => Promise<void>;
}

function RoomLine({ item }: { item: RoomItem }) {
  const t = useTranslations("notes");
  const room = item.kind === "note" ? item.note.room : item.post.room;
  if (!room) return null;
  return (
    <p className="-mt-1 mb-1.5 flex items-center gap-3 text-[13px] font-medium text-slate-500 dark:text-slate-400">
      <span aria-hidden className="w-9 shrink-0" />
      <BlogLink
        href={roomPath(room.id)}
        data-note-room={itemKey(item)}
        className="focus-ring min-w-0 truncate rounded hover:text-slate-800 hover:underline dark:hover:text-slate-200"
      >
        {t("fromRoom", { room: room.name })}
      </BlogLink>
    </p>
  );
}

export const RoomsAll = forwardRef<RoomsAllHandle, { empty: boolean }>(function RoomsAll({ empty }, ref) {
  const t = useTranslations("rooms");
  const [items, setItems] = useState<RoomItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const seen = useRef(new Map<number, number>());
  const sent = useRef(new Map<number, number>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const byKey = useRef(new Map<string, RoomItem>());

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    list.current?.querySelectorAll<HTMLElement>("[data-rooms-all-item]").forEach((el) => {
      const box = el.getBoundingClientRect();
      const note = seenNote(byKey.current.get(el.dataset.roomsAllItem ?? ""));
      if (note && box.bottom > 0 && box.top < window.innerHeight) seen.current = noteSeen(seen.current, note);
    });
    const targets = readTargets(seen.current, sent.current);
    targets.forEach(({ roomId, noteId }) => sent.current.set(roomId, noteId));
    await Promise.all(targets.map(({ roomId, noteId }) => markRoomRead(roomId, noteId).catch(() => undefined)));
  }, []);

  useImperativeHandle(ref, () => ({ flush }), [flush]);

  const load = useCallback(() => {
    setState("loading");
    listAllRoomItems()
      .then((page) => {
        setItems(page.items);
        setCursor(page.next);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(load, [load]);
  useEffect(() => () => void flush(), [flush]);

  useEffect(() => {
    byKey.current = new Map(items.map((item) => [itemKey(item), item]));
  }, [items]);

  useEffect(() => {
    const root = list.current;
    if (!root || items.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        let next = seen.current;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const note = seenNote(byKey.current.get((entry.target as HTMLElement).dataset.roomsAllItem ?? ""));
          if (note) next = noteSeen(next, note);
        }
        if (next === seen.current) return;
        seen.current = next;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void flush(), READ_AFTER_MS);
      },
      { threshold: 0.6 },
    );
    root.querySelectorAll("[data-rooms-all-item]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items, flush]);

  const hasNext = cursor !== null;
  const more = useCallback(async () => {
    if (loadingMore || cursor === null) return;
    setLoadingMore(true);
    try {
      const page = await listAllRoomItems(cursor);
      setItems((current) => {
        const known = new Set(current.map(itemKey));
        return [...current, ...page.items.filter((item) => !known.has(itemKey(item)))];
      });
      setCursor(page.next);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNext || loadingMore) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void more(), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNext, loadingMore, more]);

  if (state === "loading" && items.length === 0) return <NoteListSkeleton />;
  if (state === "error" && items.length === 0) {
    return (
      <div className="mt-6">
        <ErrorState title={t("loadFailed")} onRetry={load} />
      </div>
    );
  }
  if (items.length === 0) return empty ? null : <BlogEmpty title={t("allEmpty")} />;

  const breaks = roomLineBreaks(items);
  return (
    <div data-testid="rooms-all">
      <div ref={list} className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item, i) => (
          <div key={itemKey(item)} data-rooms-all-item={itemKey(item)}>
            <InsideRoomProvider roomId={itemRoomId(item) ?? -1}>
              <RoomItemRow
                item={item}
                maxReplies={0}
                context={breaks[i] ? <RoomLine item={item} /> : undefined}
                onReplace={(next) =>
                  setItems((current) =>
                    current.map((c) => (c.kind === "note" && c.note.id === next.id ? { ...c, note: next } : c)),
                  )
                }
                onRemove={(id) => setItems((current) => current.filter((c) => !(c.kind === "note" && c.note.id === id)))}
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
