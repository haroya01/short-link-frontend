import { describe, expect, it } from "vitest";
import type { Note, NoteFilter } from "@/modules/notes/api/notes";
import { noteVerdict, textVerdict } from "./note-filter-match";

function filter(partial: Partial<NoteFilter>): NoteFilter {
  return {
    id: 1,
    phrase: "스포일러",
    wholeWord: false,
    context: ["home", "public"],
    action: "warn",
    expiresAt: null,
    ...partial,
  };
}

function note(body: string, authorId = 2): Note {
  return {
    id: 9,
    body,
    createdAt: "2026-10-07T00:00:00Z",
    editedAt: null,
    likeCount: 0,
    likedByMe: null,
    author: { id: authorId, username: "yuna", avatarUrl: null },
    media: [{ url: "x", altText: "결말 장면", contentType: "image/jpeg" }],
    quotedPost: null,
    inReplyToId: null,
    replyCount: 0,
    repostCount: 0,
    repostedByMe: null,
    quotedNote: null,
    linkPreview: null,
  };
}

describe("note filters", () => {
  it("warns with every matching phrase and hides when any filter hides", () => {
    const warn = [filter({ id: 1 }), filter({ id: 2, phrase: "결말" })];
    expect(textVerdict("스포일러 주의: 결말", warn, "home")).toEqual({
      action: "warn",
      phrases: ["스포일러", "결말"],
    });
    expect(textVerdict("스포일러", [...warn, filter({ id: 3, action: "hide" })], "home")).toEqual({
      action: "hide",
    });
  });

  it("matches case-insensitively, and a whole word only on word edges", () => {
    expect(textVerdict("HEXAGONAL ports", [filter({ phrase: "hexagonal" })], "public")).not.toBeNull();
    const whole = [filter({ phrase: "cat", wholeWord: true })];
    expect(textVerdict("a cat sat", whole, "home")).not.toBeNull();
    expect(textVerdict("concatenate", whole, "home")).toBeNull();
    expect(textVerdict("고양이가", [filter({ phrase: "고양이", wholeWord: true })], "home")).toBeNull();
    expect(textVerdict("고양이가", [filter({ phrase: "고양이" })], "home")).not.toBeNull();
    expect(textVerdict("a.b", [filter({ phrase: "." })], "home")).not.toBeNull();
  });

  it("skips other contexts, ended filters and the reader's own notes, and reads image descriptions", () => {
    expect(textVerdict("스포일러", [filter({ context: ["thread"] })], "home")).toBeNull();
    expect(
      textVerdict("스포일러", [filter({ expiresAt: "2026-01-01T00:00:00Z" })], "home", Date.parse("2026-10-07")),
    ).toBeNull();
    const ending = [filter({ phrase: "결말" })];
    expect(noteVerdict(note("평범한 글"), ending, "home", 1)).toEqual({ action: "warn", phrases: ["결말"] });
    expect(noteVerdict(note("평범한 글", 1), ending, "home", 1)).toBeNull();
    expect(noteVerdict(note("결말"), ending, undefined, 1)).toBeNull();
  });
});
