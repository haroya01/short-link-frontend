import { describe, expect, it } from "vitest";
import { AVATAR_TINTS, avatarInitial, avatarTint, tintIndex } from "./avatar-tint";

describe("tintIndex", () => {
  it("matches the indices iOS Palette.avatarTint picks", () => {
    const vectors: [string, number][] = [
      ["haneul", 0],
      ["minji", 2],
      ["junho", 3],
      ["yuki_dev", 5],
      ["alice@mastodon.social", 1],
      ["홍길동", 3],
      ["dohyun", 4],
      ["haruka", 1],
    ];
    for (const [handle, index] of vectors) expect(tintIndex(handle), handle).toBe(index);
  });

  it("ignores case", () => {
    expect(tintIndex("MinJi")).toBe(tintIndex("minji"));
  });

  it("spreads sixty handles over all six tints", () => {
    const used = new Set(Array.from({ length: 60 }, (_, i) => tintIndex(`user${i}`)));
    expect(used.size).toBe(AVATAR_TINTS.length);
  });
});

describe("avatarTint", () => {
  it("names the tint the handle picks", () => {
    expect(avatarTint("haneul")).toBe("rose");
    expect(avatarTint("haruka")).toBe("amber");
  });

  it("keeps an unknown person on the neutral disc", () => {
    for (const handle of [null, undefined, ""]) expect(avatarTint(handle)).toBe("neutral");
  });
});

describe("avatarInitial", () => {
  it.each([
    ["dohyun", "D"],
    ["도현", "도"],
    ["ゆな", "ゆ"],
    ["ーさくら", "さ"],
    ["@yuna", "Y"],
    ["  ﾕﾅ", "ユ"],
    ["😀abc", "A"],
    ["😀", "😀"],
    ["7days", "7"],
    ["istanbul", "I"],
    ["", ""],
  ])("%j → %j", (name, initial) => {
    expect(avatarInitial(name)).toBe(initial);
  });
});
