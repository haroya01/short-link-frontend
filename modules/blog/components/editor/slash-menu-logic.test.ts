import { describe, expect, it } from "vitest";
import { keywordMatch, matchSlashQuery } from "./slash-menu-logic";

describe("matchSlashQuery", () => {
  it("opens on a lone slash at the block start with an empty query", () => {
    expect(matchSlashQuery("/")).toBe("");
  });

  it("captures the query typed after the slash", () => {
    expect(matchSlashQuery("/h2")).toBe("h2");
    expect(matchSlashQuery("/image")).toBe("image");
  });

  it("triggers after whitespace mid-line", () => {
    expect(matchSlashQuery("hello /img")).toBe("img");
    expect(matchSlashQuery("hello /")).toBe("");
  });

  it("does NOT trigger when the slash follows a non-space character", () => {
    expect(matchSlashQuery("abc/h2")).toBeNull();
    expect(matchSlashQuery("path/to")).toBeNull();
  });

  it("does NOT trigger without a slash, or once the query closes with a space", () => {
    expect(matchSlashQuery("just text")).toBeNull();
    expect(matchSlashQuery("/h2 done")).toBeNull();
  });
});

describe("keywordMatch", () => {
  const kws = ["image", "img", "photo", "이미지"];

  it("matches every item on an empty query", () => {
    expect(keywordMatch(kws, "")).toBe(true);
  });

  it("matches case-insensitive substrings", () => {
    expect(keywordMatch(kws, "img")).toBe(true);
    expect(keywordMatch(kws, "IMG")).toBe(true);
    expect(keywordMatch(kws, "pho")).toBe(true);
    expect(keywordMatch(kws, "이미")).toBe(true);
  });

  it("rejects non-matching queries", () => {
    expect(keywordMatch(kws, "quote")).toBe(false);
  });
});
