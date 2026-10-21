import type { Note } from "@/modules/notes/api/notes";
import type { RoomItem } from "@/modules/rooms/api/rooms";
import { itemRoomId } from "@/modules/rooms/lib/room-items";

export type RoomsView = "rooms" | "all";

const VIEW_KEY = "kurl:rooms-view";

export function readRoomsView(): RoomsView {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "all" ? "all" : "rooms";
  } catch {
    return "rooms";
  }
}

export function writeRoomsView(view: RoomsView): void {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    return;
  }
}

export function roomLineBreaks(items: RoomItem[]): boolean[] {
  const rooms = items.map(itemRoomId);
  return rooms.map((room, i) => room != null && (i === 0 || rooms[i - 1] !== room));
}

export function noteSeen(seen: Map<number, number>, note: Pick<Note, "id" | "room">): Map<number, number> {
  const roomId = note.room?.id;
  if (roomId == null || (seen.get(roomId) ?? -Infinity) >= note.id) return seen;
  return new Map(seen).set(roomId, note.id);
}

export function readTargets(seen: Map<number, number>, sent: Map<number, number>): { roomId: number; noteId: number }[] {
  return [...seen].filter(([roomId, noteId]) => (sent.get(roomId) ?? -Infinity) < noteId).map(([roomId, noteId]) => ({ roomId, noteId }));
}
