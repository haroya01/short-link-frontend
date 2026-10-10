import { describe, expect, it } from "vitest";
import { pastedUrl, planPaste } from "./link-paste";

const spot = (over: Partial<{ selection: boolean; emptyLine: boolean; code: boolean }> = {}) => ({
  selection: false,
  emptyLine: false,
  code: false,
  ...over,
});

describe("pastedUrl", () => {
  it("takes one bare http(s) URL, trimmed", () => {
    expect(pastedUrl("  https://kurl.me/about \n")).toBe("https://kurl.me/about");
    expect(pastedUrl("http://example.com/a?b=1#c")).toBe("http://example.com/a?b=1#c");
  });

  it("leaves anything else to the editor's normal paste", () => {
    expect(pastedUrl("see https://kurl.me")).toBeNull();
    expect(pastedUrl("https://a.com https://b.com")).toBeNull();
    expect(pastedUrl("javascript:alert(1)")).toBeNull();
    expect(pastedUrl("kurl.me")).toBeNull();
    expect(pastedUrl("")).toBeNull();
    expect(pastedUrl(null)).toBeNull();
  });
});

describe("planPaste", () => {
  it("links the selected text to a pasted URL", () => {
    expect(planPaste("https://kurl.me", spot({ selection: true }))).toEqual({ kind: "link-selection", href: "https://kurl.me" });
    expect(planPaste("https://kurl.me", spot({ selection: true, emptyLine: true }))).toEqual({
      kind: "link-selection",
      href: "https://kurl.me",
    });
  });

  it("offers link or card for a bare URL on an empty line, and link or video for a video URL", () => {
    expect(planPaste("https://kurl.me/about", spot({ emptyLine: true }))).toEqual({
      kind: "link-with-choice",
      href: "https://kurl.me/about",
      video: false,
    });
    expect(planPaste("https://youtu.be/dQw4w9WgXcQ", spot({ emptyLine: true }))).toMatchObject({
      kind: "link-with-choice",
      video: true,
    });
  });

  it("keeps a URL pasted mid-sentence a plain link, with no choice", () => {
    expect(planPaste("https://kurl.me", spot())).toEqual({ kind: "link-inline", href: "https://kurl.me" });
  });

  it("leaves code and non-URL text alone", () => {
    expect(planPaste("https://kurl.me", spot({ code: true, emptyLine: true }))).toEqual({ kind: "default" });
    expect(planPaste("hello", spot({ emptyLine: true }))).toEqual({ kind: "default" });
  });
});
