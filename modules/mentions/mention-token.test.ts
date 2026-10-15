import { describe, expect, it } from "vitest";
import { applyMention, mentionTokenAt } from "./mention-token";

describe("mentionTokenAt", () => {
  it("finds the @name right before the caret, an empty one included", () => {
    expect(mentionTokenAt("hi @yu", 6)).toEqual({ start: 3, query: "yu" });
    expect(mentionTokenAt("@", 1)).toEqual({ start: 0, query: "" });
    expect(mentionTokenAt("(@하루", 4)).toEqual({ start: 1, query: "하루" });
  });

  it("ignores an email, a finished name, and text after the caret", () => {
    expect(mentionTokenAt("mail a@b", 8)).toBeNull();
    expect(mentionTokenAt("@yuna hi", 8)).toBeNull();
    expect(mentionTokenAt("@yuna hi", 3)).toEqual({ start: 0, query: "yu" });
  });
});

describe("applyMention", () => {
  it("swaps the typed part for the handle and a space, keeping what follows", () => {
    const token = mentionTokenAt("hey @yu there", 7)!;
    expect(applyMention("hey @yu there", token, 7, "yuna")).toEqual({ text: "hey @yuna there", caret: 10 });
  });
});
