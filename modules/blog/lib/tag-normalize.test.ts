import { describe, expect, it } from "vitest";
import { isDisplayableTag } from "@/modules/blog/lib/tag-normalize";

describe("isDisplayableTag", () => {
  it("keeps real multi-character topics (ko / en / ja)", () => {
    expect(isDisplayableTag("개발")).toBe(true);
    expect(isDisplayableTag("nextjs")).toBe(true);
    expect(isDisplayableTag("machine learning")).toBe(true);
    expect(isDisplayableTag("회고")).toBe(true);
    expect(isDisplayableTag("プログラミング")).toBe(true);
    expect(isDisplayableTag("c#")).toBe(true);
  });

  it("drops incomplete Korean jamo (half-finished IME input)", () => {
    expect(isDisplayableTag("ㄴ")).toBe(false);
    expect(isDisplayableTag("ㅏ")).toBe(false);
    expect(isDisplayableTag("ㄱㄴ")).toBe(false);
  });

  it("drops empty / single-character tags", () => {
    expect(isDisplayableTag("")).toBe(false);
    expect(isDisplayableTag("  ")).toBe(false);
    expect(isDisplayableTag("a")).toBe(false);
    expect(isDisplayableTag("書")).toBe(false);
  });

  it("drops single-glyph repeats (keyboard-mash filler)", () => {
    expect(isDisplayableTag("dddd")).toBe(false);
    expect(isDisplayableTag("aaaa")).toBe(false);
    expect(isDisplayableTag("ㅋㅋㅋ")).toBe(false);
    expect(isDisplayableTag("....")).toBe(false);
  });
});
