import { describe, expect, it } from "vitest";
import { splitEmoji, splitNoteEmoji } from "./custom-emoji";

const ZWSP = String.fromCharCode(0x200b);
const ghost = { shortcode: "neoghost", url: "https://media.example/neoghost.png" };
const mummy = { shortcode: "aramaki_halloween_mummy", url: "https://media.example/mummy.webp" };
const emojis = [ghost, mummy];

const picture = (emoji: { shortcode: string; url: string }) => ({ kind: "emoji", ...emoji });

describe("splitEmoji", () => {
  it("turns a shortcode the note lists into its picture", () => {
    expect(splitEmoji("boo :neoghost: boo", emojis)).toEqual([
      { kind: "text", value: "boo " },
      picture(ghost),
      { kind: "text", value: " boo" },
    ]);
  });

  it("leaves a shortcode the note does not list as text", () => {
    expect(splitEmoji("hi :blobcat: and :neoghost:", emojis)).toEqual([
      { kind: "text", value: "hi :blobcat: and " },
      picture(ghost),
    ]);
    expect(splitEmoji("hi :neoghost:", [])).toEqual([{ kind: "text", value: "hi :neoghost:" }]);
    expect(splitEmoji("hi :neoghost:", undefined)).toEqual([{ kind: "text", value: "hi :neoghost:" }]);
  });

  it("is exact about the name: case, colons and length", () => {
    expect(splitEmoji(":NeoGhost: :neoghost :x: neoghost:", [...emojis, { shortcode: "x", url: "https://media.example/x.png" }])).toEqual([
      { kind: "text", value: ":NeoGhost: :neoghost :x: neoghost:" },
    ]);
  });

  it("drops the zero-width space Mastodon puts beside a replaced emoji, and only there", () => {
    expect(splitEmoji(`${ZWSP}:aramaki_halloween_mummy:${ZWSP} trick`, emojis)).toEqual([
      picture(mummy),
      { kind: "text", value: " trick" },
    ]);
    expect(splitEmoji(`a${ZWSP}:blobcat:${ZWSP}b`, emojis)).toEqual([{ kind: "text", value: `a${ZWSP}:blobcat:${ZWSP}b` }]);
  });

  it("replaces several emojis, including ones written back to back", () => {
    expect(splitEmoji(`:neoghost::aramaki_halloween_mummy:${ZWSP}:neoghost: end`, emojis)).toEqual([
      picture(ghost),
      picture(mummy),
      picture(ghost),
      { kind: "text", value: " end" },
    ]);
    expect(splitEmoji(":blobcat::neoghost:", emojis)).toEqual([{ kind: "text", value: ":blobcat:" }, picture(ghost)]);
  });

  it("ignores entries that are not a plain name with an https picture", () => {
    const odd = [
      { shortcode: "plain", url: "http://media.example/plain.png" },
      { shortcode: "script", url: "javascript:alert(1)" },
      { shortcode: ":wrapped:", url: "https://media.example/wrapped.png" },
    ];
    expect(splitEmoji(":plain: :script: ::wrapped::", odd)).toEqual([{ kind: "text", value: ":plain: :script: ::wrapped::" }]);
  });
});

describe("splitNoteEmoji", () => {
  it("never touches a shortcode inside a link or a hashtag", () => {
    expect(
      splitNoteEmoji("https://media.example/:neoghost: #neoghost #tag:neoghost: :neoghost:", emojis),
    ).toEqual([
      { kind: "text", value: "https://media.example/:neoghost: #neoghost #tag" },
      picture(ghost),
      { kind: "text", value: " " },
      picture(ghost),
    ]);
  });

  it("returns the text whole when the note lists no emojis", () => {
    expect(splitNoteEmoji("plain :neoghost:", null)).toEqual([{ kind: "text", value: "plain :neoghost:" }]);
    expect(splitNoteEmoji("", emojis)).toEqual([]);
  });
});
