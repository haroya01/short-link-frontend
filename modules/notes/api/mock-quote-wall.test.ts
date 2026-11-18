import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { NoteDraft } from "./notes";
import { mockCreate, mockNoteQuotes, mockPostQuotes, mockReadableThread, mockSchedule, mockThread } from "./_mocks";

const CLUB = 1;
const CLASSMATES = 2;
const CLUB_NOTE = 9910;
const CLUB_POST = 8801;
const PUBLIC_NOTE = 5;

const draft = (over: Partial<NoteDraft>): NoteDraft => ({
  body: "인용",
  images: [],
  quotedPostId: null,
  inReplyToId: null,
  quotedNoteId: null,
  ...over,
});

function refusal(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    return error instanceof ApiError ? error.detail.code : String(error);
  }
  return undefined;
}

describe("the mock keeps the server's rule for quotes and rooms", () => {
  it("quotes a room's note inside that room", () => {
    const note = mockCreate(draft({ quotedNoteId: CLUB_NOTE, roomId: CLUB }));
    expect(note.room?.id).toBe(CLUB);
    expect(note.visibility).toBe("room");
    expect(note.quotedNote?.id).toBe(CLUB_NOTE);
    expect(mockNoteQuotes(CLUB_NOTE, 0).items.map((n) => n.id)).toContain(note.id);
    expect(mockReadableThread(CLUB_NOTE)?.note.quoteCount).toBe(1);
  });

  it("refuses a room's note anywhere else", () => {
    expect(refusal(() => mockCreate(draft({ quotedNoteId: CLUB_NOTE })))).toBe("NOTE_NOT_SHAREABLE");
    expect(refusal(() => mockCreate(draft({ quotedNoteId: CLUB_NOTE, roomId: CLASSMATES })))).toBe("NOTE_NOT_SHAREABLE");
    expect(refusal(() => mockSchedule(draft({ quotedNoteId: CLUB_NOTE }), "2030-01-01T00:00:00Z"))).toBe("NOTE_NOT_SHAREABLE");
  });

  it("quotes a room's post inside that room as an open card", () => {
    const note = mockCreate(draft({ quotedPostId: CLUB_POST, roomId: CLUB }));
    expect(note.quotedPost).toMatchObject({ id: CLUB_POST, audience: "ROOM" });
    expect(note.quotedPost?.locked ?? null).toBeNull();
    const quotes = mockPostQuotes(CLUB_POST, 0);
    expect(quotes.total).toBe(1);
    expect(quotes.items[0].id).toBe(note.id);
  });

  it("refuses a room's post anywhere else", () => {
    expect(refusal(() => mockCreate(draft({ quotedPostId: CLUB_POST })))).toBe("NOTE_QUOTE_NOT_FOUND");
    expect(refusal(() => mockCreate(draft({ quotedPostId: CLUB_POST, roomId: CLASSMATES })))).toBe("NOTE_QUOTE_NOT_FOUND");
  });

  it("brings a public note into a room without listing the quote on the public note", () => {
    const before = mockNoteQuotes(PUBLIC_NOTE, 0).items.length;
    const note = mockCreate(draft({ quotedNoteId: PUBLIC_NOTE, roomId: CLUB }));
    expect(note.room?.id).toBe(CLUB);
    expect(note.quotedNote?.id).toBe(PUBLIC_NOTE);
    expect(mockNoteQuotes(PUBLIC_NOTE, 0).items).toHaveLength(before);
  });

  it("gives a room's note to its members and to no anonymous reader", () => {
    expect(mockThread(CLUB_NOTE)).toBeNull();
    expect(mockReadableThread(CLUB_NOTE)?.note.room?.id).toBe(CLUB);
  });
});
