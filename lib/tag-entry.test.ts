import { describe, expect, it } from "vitest";
import { addTag, normalizeTag } from "@/lib/tag-entry";

const limits = { max: 10, maxLen: 40 };

describe("normalizeTag", () => {
  it("strips a leading # (single or repeated) and surrounding space", () => {
    expect(normalizeTag("#dev", 40)).toBe("dev");
    expect(normalizeTag("  #dev  ", 40)).toBe("dev");
    expect(normalizeTag("## dev", 40)).toBe("dev");
    expect(normalizeTag("#태그", 40)).toBe("태그");
  });

  it("only strips a LEADING #, never one inside the tag", () => {
    expect(normalizeTag("c#", 40)).toBe("c#");
    expect(normalizeTag("f#sharp", 40)).toBe("f#sharp");
  });

  it("drops the separating commas", () => {
    expect(normalizeTag("a,b", 40)).toBe("ab");
  });

  it("caps length at 40 chars", () => {
    const long = "a".repeat(60);
    expect(normalizeTag(long, 40)).toHaveLength(40);
    expect(normalizeTag(long, 40)).toBe("a".repeat(40));
  });

  it("returns empty for whitespace / bare #", () => {
    expect(normalizeTag("   ", 40)).toBe("");
    expect(normalizeTag("#", 40)).toBe("");
    expect(normalizeTag("", 40)).toBe("");
  });

  it("keeps internal spaces (a multi-word topic stays one tag)", () => {
    expect(normalizeTag("machine learning", 40)).toBe("machine learning");
  });

  it("strips the leading # and the entry-separating commas together", () => {
    expect(normalizeTag(" #, react ,", 40)).toBe("react");
  });
});

describe("addTag", () => {
  it("appends a normalized tag", () => {
    expect(addTag(["a"], "#b", limits)).toEqual(["a", "b"]);
  });

  it("dedupes case-insensitively and returns the same reference on a no-op", () => {
    const tags = ["Dev"];
    expect(addTag(tags, "dev", limits)).toBe(tags);
    expect(addTag(tags, "#DEV", limits)).toBe(tags);
  });

  it("ignores empty entries (same reference back)", () => {
    const tags = ["a"];
    expect(addTag(tags, "  ", limits)).toBe(tags);
    expect(addTag(tags, "#", limits)).toBe(tags);
  });

  it("refuses to grow past the max", () => {
    const full = Array.from({ length: limits.max }, (_, i) => `t${i}`);
    expect(addTag(full, "extra", limits)).toBe(full);
  });

  it("stores the length-capped form", () => {
    expect(addTag([], "a".repeat(50), limits)).toEqual(["a".repeat(40)]);
  });
});
