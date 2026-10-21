import type { RoomItem, RoomListItem } from "@/modules/rooms/api/rooms";
import { itemRoomId } from "@/modules/rooms/lib/room-items";

export const QUIET_AFTER_MS = 7 * 86_400_000;
export const ROOM_BLOCK_NOTES = 2;

export function isLively(room: RoomListItem, now: number = Date.now()): boolean {
  if (!room.lastNote || !room.lastActivityAt) return false;
  return now - Date.parse(room.lastActivityAt) < QUIET_AFTER_MS;
}

export interface RoomArrangement {
  blocks: RoomListItem[];
  quiet: RoomListItem[];
}

export function arrangeRooms(rooms: RoomListItem[], now: number = Date.now()): RoomArrangement {
  const blocks = rooms.filter((room) => room.pinned || isLively(room, now));
  const recency = (room: RoomListItem) => Date.parse(room.lastActivityAt ?? "") || 0;
  const newest = (a: RoomListItem, b: RoomListItem) => recency(b) - recency(a);
  return {
    blocks: [...blocks.filter((room) => room.pinned).sort(newest), ...blocks.filter((room) => !room.pinned).sort(newest)],
    quiet: rooms.filter((room) => !blocks.includes(room)),
  };
}

export function itemsOfRoom(items: RoomItem[], roomId: number, limit = ROOM_BLOCK_NOTES): RoomItem[] {
  return items.filter((item) => itemRoomId(item) === roomId).slice(0, limit);
}

export function itemTime(item: RoomItem): string {
  return item.kind === "note" ? item.note.createdAt : item.post.publishedAt;
}

export function newestNoteId(items: RoomItem[]): number | null {
  const ids = items.flatMap((item) => (item.kind === "note" ? [item.note.id] : []));
  return ids.length > 0 ? Math.max(...ids) : null;
}

export function pinnedCount(rooms: RoomListItem[]): number {
  return rooms.filter((room) => room.pinned).length;
}

export type DayBreak = { kind: "today" } | { kind: "yesterday" } | { kind: "date"; date: Date };

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function dayBreak(times: string[], index: number, now: Date = new Date()): DayBreak | null {
  const at = new Date(times[index]);
  if (Number.isNaN(at.getTime())) return null;
  if (index > 0 && sameDay(new Date(times[index - 1]), at)) return null;
  if (sameDay(at, now)) return { kind: "today" };
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(at, yesterday)) return { kind: "yesterday" };
  return { kind: "date", date: at };
}

export function inviteUsable(
  invite: { disabled: boolean; maxUses: number | null; uses: number; expiresAt: string | null },
  now: number = Date.now(),
): boolean {
  if (invite.disabled) return false;
  if (invite.maxUses !== null && invite.uses >= invite.maxUses) return false;
  return invite.expiresAt === null || Date.parse(invite.expiresAt) > now;
}
