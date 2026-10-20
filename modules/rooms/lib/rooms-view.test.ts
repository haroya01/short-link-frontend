import { describe, expect, it } from "vitest";
import type { Note } from "@/modules/notes/api/notes";
import { noteSeen, readTargets, roomLineBreaks } from "./rooms-view";

const note = (id: number, roomId: number | null) =>
  ({ id, body: "", createdAt: "", room: roomId === null ? null : { id: roomId, name: `r${roomId}` } }) as Note;

describe("the room line in 전체", () => {
  it("shows only where the room changes from the note above", () => {
    const notes = [note(9, 1), note(8, 1), note(7, 2), note(6, 1), note(5, 1), note(4, 3)];
    expect(roomLineBreaks(notes)).toEqual([true, false, true, true, false, true]);
  });

  it("never marks a note without a room", () => {
    expect(roomLineBreaks([note(2, null), note(1, 1)])).toEqual([false, true]);
  });
});

describe("what 전체 marks read", () => {
  it("keeps the largest note id seen per room", () => {
    let seen = new Map<number, number>();
    for (const n of [note(9, 1), note(7, 2), note(5, 1), note(12, 1), note(3, null)]) seen = noteSeen(seen, n);
    expect([...seen]).toEqual([
      [1, 12],
      [2, 7],
    ]);
  });

  it("sends a room only when something newer than what was sent came by", () => {
    const seen = new Map([
      [1, 12],
      [2, 7],
      [3, 4],
    ]);
    expect(readTargets(seen, new Map([[1, 12], [2, 5]]))).toEqual([
      { roomId: 2, noteId: 7 },
      { roomId: 3, noteId: 4 },
    ]);
    expect(readTargets(seen, seen)).toEqual([]);
  });

  it("returns the same map when a note adds nothing, so a re-render does not schedule a send", () => {
    const seen = new Map([[1, 12]]);
    expect(noteSeen(seen, note(9, 1))).toBe(seen);
  });
});
