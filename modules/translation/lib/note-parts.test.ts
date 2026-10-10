import { describe, expect, it } from "vitest";
import { splitNoteText } from "@/modules/notes/lib/note-text";
import { translatableTexts, withTranslatedTexts } from "./note-parts";

describe("a note's translatable text", () => {
  const parts = splitNoteText("Thanks @mina for this https://kurl.me/x #kurl  ", ["mina"]);

  it("is only the text between mentions, links and tags, without its edge spaces", () => {
    expect(translatableTexts(parts)).toEqual(["Thanks", "for this"]);
  });

  it("goes back between the same tokens with the same spacing", () => {
    expect(withTranslatedTexts(parts, ["고마워요", "이것도"])).toEqual([
      { kind: "text", value: "고마워요 " },
      { kind: "mention", value: "mina" },
      { kind: "text", value: " 이것도 " },
      { kind: "link", value: "https://kurl.me/x" },
      { kind: "text", value: " " },
      { kind: "tag", value: "kurl" },
      { kind: "text", value: "  " },
    ]);
  });

  it("stays original when the translation comes back with a different count", () => {
    expect(withTranslatedTexts(parts, ["고마워요"])).toBeNull();
  });
});
