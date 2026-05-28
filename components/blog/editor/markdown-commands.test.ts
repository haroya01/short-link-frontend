import { describe, expect, it } from "vitest";
import {
  insertCodeBlock,
  insertImage,
  insertLink,
  prefixLines,
  wrapInline,
} from "./markdown-commands";

describe("markdown-commands", () => {
  it("wraps the selection with a marker", () => {
    const r = wrapInline("hello world", { start: 6, end: 11 }, "**");
    expect(r.value).toBe("hello **world**");
    expect(r.selection).toEqual({ start: 8, end: 13 });
  });

  it("wraps an empty selection leaving the caret between markers", () => {
    const r = wrapInline("ab", { start: 1, end: 1 }, "`");
    expect(r.value).toBe("a``b");
    expect(r.selection).toEqual({ start: 2, end: 2 });
  });

  it("prefixes a single line for a heading", () => {
    const r = prefixLines("title", { start: 0, end: 0 }, "## ");
    expect(r.value).toBe("## title");
  });

  it("numbers multiple selected lines", () => {
    const r = prefixLines("a\nb\nc", { start: 0, end: 5 }, "1. ");
    expect(r.value).toBe("1. a\n2. b\n3. c");
  });

  it("inserts a link with the selection as label", () => {
    const r = insertLink("see here", { start: 4, end: 8 });
    expect(r.value).toBe("see [here](url)");
    // caret lands on the url token
    expect(r.value.slice(r.selection.start, r.selection.end)).toBe("url");
  });

  it("inserts an image block", () => {
    const r = insertImage("x", { start: 1, end: 1 }, "https://cdn/a.png", "a");
    expect(r.value).toBe("x\n\n![a](https://cdn/a.png)\n\n");
  });

  it("inserts a fenced code block around the selection", () => {
    const r = insertCodeBlock("const x = 1", { start: 0, end: 11 });
    expect(r.value).toBe("```\nconst x = 1\n```");
  });
});
