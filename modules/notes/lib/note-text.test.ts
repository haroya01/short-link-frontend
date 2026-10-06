import { describe, expect, it } from "vitest";
import { noteLength, previewUrl, splitLinks } from "./note-text";

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
