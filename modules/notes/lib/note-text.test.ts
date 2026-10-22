import { describe, expect, it } from "vitest";
import { noteLength, previewUrl, splitNoteText, withoutCardedLink } from "./note-text";

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

  it("links a handle only for members the server confirmed, in any case", () => {
    expect(splitNoteText("@Yuki 와 @ghost, me@kurl.me @yuki@mastodon.social", ["yuki"])).toEqual([
      { kind: "mention", value: "yuki" },
      { kind: "text", value: " 와 @ghost, me@kurl.me @yuki@mastodon.social" },
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

describe("withoutCardedLink", () => {
  const video = "https://youtu.be/6Zo0eMZB6t4";

  it("drops the closing link and the line break before it when the card shows that link", () => {
    expect(withoutCardedLink(splitNoteText(`ゲーム実況\n#AlanWake\n${video}\n`), video)).toEqual([
      { kind: "text", value: "ゲーム実況\n" },
      { kind: "tag", value: "AlanWake" },
    ]);
  });

  it("keeps a link in the middle of the text even when it is the carded one", () => {
    const parts = splitNoteText(`보세요 ${video} 재밌어요`);
    expect(withoutCardedLink(parts, video)).toEqual(parts);
  });

  it("keeps a closing link the card is not about, or when there is no card", () => {
    const parts = splitNoteText(`둘 다 https://a.example ${video}`);
    expect(withoutCardedLink(parts, "https://a.example")).toEqual(parts);
    expect(withoutCardedLink(parts, null)).toEqual(parts);
    expect(withoutCardedLink(parts, undefined)).toEqual(parts);
  });

  it("leaves nothing when the note is only the carded link", () => {
    expect(withoutCardedLink(splitNoteText(` ${video} `), video)).toEqual([]);
  });
});
