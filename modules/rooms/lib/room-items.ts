import type { RoomItem } from "@/modules/rooms/api/rooms";

export function itemKey(item: RoomItem): string {
  return item.kind === "note" ? `note-${item.note.id}` : `post-${item.post.id}`;
}

export function itemRoomId(item: RoomItem): number | null {
  return (item.kind === "note" ? item.note.room?.id : item.post.room?.id) ?? null;
}
