import type { Note } from "@/modules/notes/api/notes";
import type { RoomItem } from "@/modules/rooms/api/rooms";

export function itemKey(item: RoomItem): string {
  return item.kind === "note" ? `note-${item.note.id}` : `post-${item.post.id}`;
}

export function itemRoomId(item: RoomItem): number | null {
  return (item.kind === "note" ? item.note.room?.id : item.post.room?.id) ?? null;
}

export function roomNoteIds(items: RoomItem[]): Set<number> {
  return new Set(items.flatMap((item) => (item.kind === "note" ? [item.note.id] : [])));
}

export function prependNotes(items: RoomItem[], notes: Note[]): RoomItem[] {
  const known = roomNoteIds(items);
  const fresh = notes
    .filter((note, index) => !known.has(note.id) && notes.findIndex((n) => n.id === note.id) === index)
    .sort((a, b) => b.id - a.id)
    .map((note): RoomItem => ({ kind: "note", note, replies: [] }));
  return fresh.length > 0 ? [...fresh, ...items] : items;
}
