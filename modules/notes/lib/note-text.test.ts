import { describe, expect, it } from "vitest";
import { noteLength, previewUrl, splitNoteText } from "./note-text";

describe("noteLength", () => {
  it("counts code points like the server", () => {
    expect(noteLength("😀😀")).toBe(2);
    expect(noteLength("  가나  ")).toBe(2);
  });
});

describe("splitNoteText", () => {
  it("keeps trailing punctuation out of links", () => {
    expect(splitNoteText("see https://kurl.me/a?b=1. ok")).toEqual([
      { kind: "text", value: "see " },
      { kind: "link", value: "https://kurl.me/a?b=1" },
      { kind: "text", value: ". ok" },
    ]);
  });

  it("returns plain text untouched and ignores non-http schemes", () => {
    expect(splitNoteText("javascript:alert(1)")).toEqual([{ kind: "text", value: "javascript:alert(1)" }]);
    expect(splitNoteText("")).toEqual([]);
  });

  it("finds hashtags in any script with the server's boundaries", () => {
    expect(splitNoteText("#스프링 a#b https://x.com/p#frag #123 #kurl· #हिन्दी")).toEqual([
      { kind: "tag", value: "스프링" },
      { kind: "text", value: " a#b " },
      { kind: "link", value: "https://x.com/p#frag" },
      { kind: "text", value: " #123 " },
      { kind: "tag", value: "kurl" },
      { kind: "text", value: "· " },
      { kind: "tag", value: "हिन्दी" },
    ]);
  });

  it("leaves a hashtag longer than forty characters as text", () => {
    const long = `#${"a".repeat(41)}`;
    expect(splitNoteText(long)).toEqual([{ kind: "text", value: long }]);
  });
});

describe("previewUrl", () => {
  it("picks the first link without trailing punctuation, like the server", () => {
    expect(previewUrl("read https://a.example/x). then https://b.example", false, false)).toBe("https://a.example/x");
  });

  it("gives no card to notes without a link, with photos or with a quote", () => {
    expect(previewUrl("plain", false, false)).toBeNull();
    expect(previewUrl("https://a.example", true, false)).toBeNull();
    expect(previewUrl("https://a.example", false, true)).toBeNull();
  });
});
