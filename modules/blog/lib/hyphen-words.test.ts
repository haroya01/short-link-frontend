import { describe, expect, it } from "vitest";
import { splitHyphenWords } from "./hyphen-words";

describe("splitHyphenWords", () => {
  it("keeps a hyphenated word whole so a title never breaks between RISC- and V", () => {
    expect(splitHyphenWords("가속기 탑재 RISC-V 프로세서")).toEqual([
      { text: "가속기 탑재 ", keep: false },
      { text: "RISC-V", keep: true },
      { text: " 프로세서", keep: false },
    ]);
  });

  it("handles several hyphens in one word and leaves a free-standing dash alone", () => {
    expect(splitHyphenWords("K-means 와 end-to-end - 정리")).toEqual([
      { text: "K-means", keep: true },
      { text: " 와 ", keep: false },
      { text: "end-to-end", keep: true },
      { text: " - 정리", keep: false },
    ]);
  });

  it("lets a long hyphenated run break so a narrow phone never scrolls sideways", () => {
    expect(splitHyphenWords("a-very-long-hyphenated-slug-like-word")).toEqual([
      { text: "a-very-long-hyphenated-slug-like-word", keep: false },
    ]);
  });

  it("returns a plain title as one part", () => {
    expect(splitHyphenWords("헥사고날 아키텍처")).toEqual([{ text: "헥사고날 아키텍처", keep: false }]);
  });
});
