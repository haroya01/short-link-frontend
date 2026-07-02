import { describe, expect, it } from "vitest";
import { addTag, normalizeTag, MAX_TAG_LEN, MAX_TAGS } from "@/modules/blog/lib/tag-normalize";

describe("normalizeTag", () => {
  it("strips a leading # (single or repeated) and surrounding space", () => {
    expect(normalizeTag("#dev")).toBe("dev");
    expect(normalizeTag("  #dev  ")).toBe("dev");
    expect(normalizeTag("## dev")).toBe("dev");
    expect(normalizeTag("#태그")).toBe("태그");
  });

  it("only strips a LEADING #, never one inside the tag", () => {
    expect(normalizeTag("c#")).toBe("c#");
    expect(normalizeTag("f#sharp")).toBe("f#sharp");
  });

  it("drops the separating commas", () => {
    expect(normalizeTag("a,b")).toBe("ab");
  });

  it("caps length at 40 chars", () => {
    const long = "a".repeat(60);
    expect(normalizeTag(long)).toHaveLength(MAX_TAG_LEN);
    expect(normalizeTag(long)).toBe("a".repeat(40));
  });

  it("returns empty for whitespace / bare #", () => {
    expect(normalizeTag("   ")).toBe("");
    expect(normalizeTag("#")).toBe("");
    expect(normalizeTag("")).toBe("");
  });

  it("keeps internal spaces (a multi-word topic stays one tag)", () => {
    expect(normalizeTag("machine learning")).toBe("machine learning");
  });

  it("strips the leading # and the entry-separating commas together", () => {
    expect(normalizeTag(" #, react ,")).toBe("react");
  });
});

describe("addTag", () => {
  it("appends a normalized tag", () => {
    expect(addTag(["a"], "#b")).toEqual(["a", "b"]);
  });

  it("dedupes case-insensitively and returns the same reference on a no-op", () => {
    const tags = ["Dev"];
    expect(addTag(tags, "dev")).toBe(tags);
    expect(addTag(tags, "#DEV")).toBe(tags);
  });

  it("ignores empty entries (same reference back)", () => {
    const tags = ["a"];
    expect(addTag(tags, "  ")).toBe(tags);
    expect(addTag(tags, "#")).toBe(tags);
  });

  it("refuses to grow past the max", () => {
    const full = Array.from({ length: MAX_TAGS }, (_, i) => `t${i}`);
    expect(addTag(full, "extra")).toBe(full);
  });

  it("stores the length-capped form", () => {
    expect(addTag([], "a".repeat(50))).toEqual(["a".repeat(40)]);
  });
});
