import { describe, expect, it } from "vitest";
import { noteLength, splitLinks } from "./note-text";

describe("noteLength", () => {
  it("counts code points like the server", () => {
    expect(noteLength("😀😀")).toBe(2);
    expect(noteLength("  가나  ")).toBe(2);
  });
});

describe("splitLinks", () => {
  it("keeps trailing punctuation out of links", () => {
    expect(splitLinks("see https://kurl.me/a?b=1. ok")).toEqual([
      { kind: "text", value: "see " },
      { kind: "link", value: "https://kurl.me/a?b=1" },
      { kind: "text", value: ". ok" },
    ]);
  });

  it("returns plain text untouched and ignores non-http schemes", () => {
    expect(splitLinks("javascript:alert(1)")).toEqual([{ kind: "text", value: "javascript:alert(1)" }]);
    expect(splitLinks("")).toEqual([]);
  });
});
