import { describe, expect, it } from "vitest";
import type { PostAudience } from "@/modules/blog/lib/post-audience";
import type { NoteVisibility } from "@/modules/notes/api/notes";
import { noteQuotableIn, postQuotableIn, quoteListedOn, quoteRoom } from "./quote-wall";

const CLUB = { id: 1, name: "동아리 사람들" };
const FAMILY = { id: 5, name: "우리 가족" };
const OUTSIDE = null;

describe("where a note may be quoted or carried as a card", () => {
  it.each<NoteVisibility | undefined>(["public", "unlisted", undefined])("a %s note goes anywhere", (visibility) => {
    expect(noteQuotableIn({ visibility }, OUTSIDE)).toBe(true);
    expect(noteQuotableIn({ visibility }, CLUB.id)).toBe(true);
    expect(noteQuotableIn({ visibility, room: null }, FAMILY.id)).toBe(true);
  });

  it("a room's note stays in that room", () => {
    const note = { visibility: "room" as const, room: CLUB };
    expect(noteQuotableIn(note, CLUB.id)).toBe(true);
    expect(noteQuotableIn(note, OUTSIDE)).toBe(false);
    expect(noteQuotableIn(note, FAMILY.id)).toBe(false);
  });

  it.each<NoteVisibility>(["private", "direct"])("a %s note goes nowhere", (visibility) => {
    expect(noteQuotableIn({ visibility }, OUTSIDE)).toBe(false);
    expect(noteQuotableIn({ visibility }, CLUB.id)).toBe(false);
  });

  it("a room note that arrives without its room goes nowhere", () => {
    expect(noteQuotableIn({ visibility: "room" }, CLUB.id)).toBe(false);
    expect(noteQuotableIn({ visibility: "room" }, OUTSIDE)).toBe(false);
  });
});

describe("where a post may be quoted", () => {
  it.each<PostAudience | undefined>(["PUBLIC", "FOLLOWERS", "PASSWORD", undefined])(
    "a %s post goes anywhere",
    (audience) => {
      expect(postQuotableIn({ audience }, OUTSIDE)).toBe(true);
      expect(postQuotableIn({ audience }, CLUB.id)).toBe(true);
    },
  );

  it("a link-only post goes nowhere", () => {
    expect(postQuotableIn({ audience: "UNLISTED" }, OUTSIDE)).toBe(false);
    expect(postQuotableIn({ audience: "UNLISTED" }, CLUB.id)).toBe(false);
  });

  it("a room's post stays in that room", () => {
    const post = { audience: "ROOM" as const, room: CLUB };
    expect(postQuotableIn(post, CLUB.id)).toBe(true);
    expect(postQuotableIn(post, OUTSIDE)).toBe(false);
    expect(postQuotableIn(post, FAMILY.id)).toBe(false);
  });

  it("a room post that arrives without its room goes nowhere", () => {
    expect(postQuotableIn({ audience: "ROOM" }, CLUB.id)).toBe(false);
    expect(postQuotableIn({ audience: "ROOM" }, OUTSIDE)).toBe(false);
  });
});

describe("which quotes are listed on what they quote", () => {
  it("lists a public quote on something outside rooms, and no room or followers-only quote", () => {
    expect(quoteListedOn({ visibility: "public" }, OUTSIDE)).toBe(true);
    expect(quoteListedOn({ visibility: "unlisted" }, OUTSIDE)).toBe(true);
    expect(quoteListedOn({ visibility: "room", room: CLUB }, OUTSIDE)).toBe(false);
    expect(quoteListedOn({ visibility: "private" }, OUTSIDE)).toBe(false);
  });

  it("lists on a room's note or post only the quotes made in that room", () => {
    expect(quoteListedOn({ visibility: "room", room: CLUB }, CLUB.id)).toBe(true);
    expect(quoteListedOn({ visibility: "room", room: FAMILY }, CLUB.id)).toBe(false);
    expect(quoteListedOn({ visibility: "public" }, CLUB.id)).toBe(false);
  });
});

describe("where a quote is posted", () => {
  it("fixes the quote of a room's note or post to that room", () => {
    expect(quoteRoom({ room: CLUB })).toEqual(CLUB);
  });

  it("leaves the destination open for anything outside rooms", () => {
    expect(quoteRoom({})).toBeNull();
    expect(quoteRoom({ room: null })).toBeNull();
  });
});
