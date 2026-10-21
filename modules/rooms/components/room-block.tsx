"use client";

import { useRef, useState, type ReactNode } from "react";
import { ChevronRight, MoreHorizontal, Pin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDismiss } from "@/hooks/use-dismiss";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import type { Note } from "@/modules/notes/api/notes";
import { NoteFeedRow } from "@/modules/notes/components/note-list";
import type { RoomListItem } from "@/modules/rooms/api/rooms";
import { roomPath } from "@/modules/rooms/lib/room-href";
import { InsideRoomProvider } from "@/modules/rooms/lib/room-scope";
import { useCompactTime } from "@/modules/notes/lib/use-compact-time";
import { RoomFaces } from "./room-faces";

const LONG_PRESS_MS = 500;

function usePinMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressed = useRef(false);
  useDismiss(open, root, () => setOpen(false));

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const press = {
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      setOpen(true);
    },
    onPointerDown: (e: React.PointerEvent) => {
      pressed.current = false;
      if (e.pointerType !== "touch") return;
      cancel();
      timer.current = setTimeout(() => {
        pressed.current = true;
        setOpen(true);
      }, LONG_PRESS_MS);
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onPointerMove: (e: React.PointerEvent) => {
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 6) cancel();
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (!pressed.current) return;
      pressed.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };
  return { open, setOpen, root, press };
}

function PinMenu({
  room,
  menu,
  onPin,
}: {
  room: RoomListItem;
  menu: ReturnType<typeof usePinMenu>;
  onPin: (room: RoomListItem, pinned: boolean) => void;
}) {
  const t = useTranslations("rooms");
  return (
    <div ref={menu.root} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-label={t("roomMenu", { room: room.name })}
        data-room-menu={room.id}
        onClick={() => menu.setOpen((v) => !v)}
        className="touch-target focus-ring -mr-1 grid h-7 w-7 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <MoreHorizontal aria-hidden className="h-4 w-4" />
      </button>
      {menu.open && (
        <div
          role="menu"
          className="absolute right-0 top-8 z-20 w-44 animate-fade-in rounded-surface border border-slate-200 bg-white p-1 shadow-float motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              menu.setOpen(false);
              onPin(room, !room.pinned);
            }}
            className="focus-ring flex w-full items-center gap-2.5 rounded-surface px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Pin aria-hidden className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
            {room.pinned ? t("unpin") : t("pin")}
          </button>
        </div>
      )}
    </div>
  );
}

export function RoomBlock({
  room,
  notes,
  index,
  onPin,
  onReplace,
  onRemove,
}: {
  room: RoomListItem;
  notes: Note[];
  index: number;
  onPin: (room: RoomListItem, pinned: boolean) => void;
  onReplace: (note: Note) => void;
  onRemove: (id: number) => void;
}) {
  const t = useTranslations("rooms");
  const ago = useCompactTime();
  const menu = usePinMenu();
  const href = roomPath(room.id);

  return (
    <section
      data-room-block={room.id}
      aria-label={room.name}
      style={{ ["--idx" as string]: Math.min(index, 6) }}
      className="profile-fade border-b border-slate-100 dark:border-slate-800"
    >
      <div {...menu.press} className="flex select-none items-center gap-2 pb-1 pt-6 [-webkit-touch-callout:none]">
        {room.pinned && (
          <Pin
            role="img"
            aria-label={t("pinned")}
            data-room-pinned
            className="h-3.5 w-3.5 shrink-0 fill-current text-slate-400 dark:text-slate-500"
          />
        )}
        <BlogLink
          href={href}
          data-room-name={room.id}
          className="focus-ring min-w-0 truncate rounded text-[17px] font-bold leading-6 text-slate-900 hover:underline dark:text-slate-100"
        >
          {room.name}
        </BlogLink>
        {room.unreadCount > 0 && (
          <span className="shrink-0 text-[13px] font-semibold tabular-nums text-accent-700 dark:text-accent-400">
            {t("unread", { count: room.unreadCount })}
          </span>
        )}
        <span className="ml-auto" />
        <RoomFaces people={room.faces} limit={4} />
        <PinMenu room={room} menu={menu} onPin={onPin} />
      </div>
      {notes.length > 0 ? (
        <InsideRoomProvider roomId={room.id}>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notes.map((note) => (
              <NoteFeedRow key={note.id} note={note} onReplace={onReplace} onRemove={onRemove} />
            ))}
          </div>
        </InsideRoomProvider>
      ) : (
        room.lastNote && (
          <BlogLink href={href} className="focus-ring block rounded py-3">
            <p className="line-clamp-3 text-[15px] leading-[1.45] text-slate-800 dark:text-slate-200">
              {room.lastNote.excerpt}
            </p>
            {room.lastNote.createdAt && (
              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{ago(room.lastNote.createdAt)}</p>
            )}
          </BlogLink>
        )
      )}
      <BlogLink
        href={href}
        aria-label={t("moreLabel", { room: room.name })}
        data-room-more={room.id}
        className="focus-ring -ml-1 mb-3 mt-0.5 inline-flex items-center gap-0.5 rounded px-1 py-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        {t("more")}
        <ChevronRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2.25} />
      </BlogLink>
    </section>
  );
}

export function QuietRoomLine({
  room,
  onPin,
}: {
  room: RoomListItem;
  onPin: (room: RoomListItem, pinned: boolean) => void;
}) {
  const t = useTranslations("rooms");
  const ago = useCompactTime();
  const menu = usePinMenu();
  return (
    <li data-room-quiet={room.id} {...menu.press} className="flex select-none items-center gap-2 [-webkit-touch-callout:none]">
      <BlogLink
        href={roomPath(room.id)}
        data-room-name={room.id}
        className="focus-ring flex min-w-0 flex-1 items-baseline gap-2 rounded py-3"
      >
        <span className="min-w-0 truncate text-[15px] font-semibold text-slate-700 dark:text-slate-300">{room.name}</span>
        <span className="shrink-0 text-[13px] tabular-nums text-slate-400 dark:text-slate-500">{room.memberCount}</span>
        <span className="ml-auto shrink-0 text-[13px] text-slate-400 dark:text-slate-500">
          {room.lastNote && room.lastActivityAt ? ago(room.lastActivityAt) : t("noNotesYet")}
        </span>
      </BlogLink>
      <PinMenu room={room} menu={menu} onPin={onPin} />
    </li>
  );
}

export function RoomsSection({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <section data-testid={testId} className="pt-6">
      <RailHeading>{title}</RailHeading>
      {children}
    </section>
  );
}
