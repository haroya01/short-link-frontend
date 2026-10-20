import { describe, expect, it } from "vitest";
import { literalFootnotes } from "./literal-footnotes";

describe("literalFootnotes", () => {
  it("escapes footnote references and definitions so they stay text", () => {
    expect(literalFootnotes("문장[^1]\n\n[^1]: 설명")).toBe("문장\\[^1]\n\n\\[^1]: 설명");
  });

  it("leaves code fences and ordinary links alone", () => {
    const text = "```md\n[^1]: 코드 안\n```\n[링크](https://kurl.me)";
    expect(literalFootnotes(text)).toBe(text);
  });
});
