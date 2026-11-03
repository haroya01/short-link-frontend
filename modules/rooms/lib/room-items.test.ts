import { describe, expect, it } from "vitest";
import type { Note } from "@/modules/notes/api/notes";
import type { RoomItem } from "@/modules/rooms/api/rooms";
import { prependNotes, roomNoteIds } from "./room-items";

const note = (id: number) => ({ id, body: `${id}` }) as unknown as Note;
const noteItem = (id: number): RoomItem => ({ kind: "note", note: note(id), replies: [] });
const postItem = (id: number) => ({ kind: "post", post: { id }, replies: [] }) as unknown as RoomItem;

describe("prependNotes", () => {
  it("puts notes that just landed on top, newest first", () => {
    const items = [noteItem(10), postItem(10), noteItem(8)];
    const next = prependNotes(items, [note(11), note(12)]);
    expect(next.map((item) => (item.kind === "note" ? `n${item.note.id}` : `p${item.post.id}`))).toEqual([
      "n12",
      "n11",
      "n10",
      "p10",
      "n8",
    ]);
  });

  it("never shows the same note twice", () => {
    const items = [noteItem(10)];
    expect(prependNotes(items, [note(10)])).toBe(items);
    expect([...roomNoteIds(prependNotes(items, [note(11), note(11), note(10)]))]).toEqual([11, 10]);
  });
});
