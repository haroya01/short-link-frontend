import { describe, expect, it, vi } from "vitest";
import type { Note, NoteThread } from "@/modules/notes/api/notes";

vi.mock("@/modules/notes/api/notes", () => ({ NOTE_MAX_THREAD_NOTES: 10 }));

import { placeReply } from "./thread-reply";

const note = (id: number, authorId: number, inReplyToId: number | null = null, replyCount = 0) =>
  ({ id, author: { id: authorId, username: `u${authorId}` }, inReplyToId, replyCount, body: `${id}` }) as unknown as Note;

const thread = (overrides: Partial<NoteThread> = {}): NoteThread => ({
  note: note(10, 1, 5, 1),
  parent: note(5, 2, null, 1),
  replies: [note(20, 3, 10)],
  continuation: [],
  ...overrides,
});

describe("placeReply", () => {
  it("puts someone's reply to the open note on top of the replies and counts it", () => {
    const placed = placeReply(thread(), note(30, 4, 10));
    expect(placed.landing).toBe("replies");
    expect(placed.thread.replies.map((r) => r.id)).toEqual([30, 20]);
    expect(placed.thread.note.replyCount).toBe(2);
  });

  it("makes the author's first reply to their own note the next part of the thread", () => {
    const placed = placeReply(thread(), note(31, 1, 10));
    expect(placed.landing).toBe("continuation");
    expect(placed.thread.continuation?.map((r) => r.id)).toEqual([31]);
    expect(placed.thread.replies.map((r) => r.id)).toEqual([20]);
  });

  it("goes on after the last part when the author answers it", () => {
    const placed = placeReply(thread({ continuation: [note(11, 1, 10)] }), note(32, 1, 11));
    expect(placed.landing).toBe("continuation");
    expect(placed.thread.continuation?.map((r) => [r.id, r.replyCount])).toEqual([
      [11, 1],
      [32, 0],
    ]);
  });

  it("only counts a reply to a note further down, which the page does not show", () => {
    const placed = placeReply(thread(), note(33, 4, 20));
    expect(placed.landing).toBe("elsewhere");
    expect(placed.thread.replies.map((r) => [r.id, r.replyCount])).toEqual([[20, 1]]);
    expect(placed.thread.note.replyCount).toBe(1);
  });

  it("counts a reply to the parent without moving anything", () => {
    const placed = placeReply(thread(), note(34, 4, 5));
    expect(placed.landing).toBe("elsewhere");
    expect(placed.thread.parent?.replyCount).toBe(2);
  });
});
