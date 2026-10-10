import { describe, expect, it } from "vitest";
import { AVATAR_TINTS, NEUTRAL_TINT, avatarInitial, avatarTint, tintIndex } from "./avatar-tint";

describe("tintIndex", () => {
  it("matches the vectors iOS checks against", () => {
    const vectors: [number, number][] = [
      [1, 4], [2, 1], [3, 6], [4, 3], [5, 0], [15, 2], [16, 7], [42, 7], [1000, 0],
      [-7, 5], [-123456, 7], [2 ** 31, 4], [2 ** 33 + 5, 0],
    ];
    for (const [id, index] of vectors) expect(tintIndex(id), String(id)).toBe(index);
  });

  it("spreads the first ten thousand ids over all eight tints within 10% of even", () => {
    const counts = new Array(8).fill(0);
    for (let id = 1; id <= 10_000; id++) counts[tintIndex(id)]++;
    for (const count of counts) expect(Math.abs(count - 1250)).toBeLessThan(125);
  });
});

describe("avatarTint", () => {
  it("gives a person with no local id, a remote account or a placeholder the neutral disc", () => {
    for (const seed of [null, undefined, 0, -9800, Number.NaN]) expect(avatarTint(seed)).toBe(NEUTRAL_TINT);
  });

  it("keeps the same tint for the same id", () => {
    expect(avatarTint(42)).toBe(AVATAR_TINTS[7]);
    expect(avatarTint(42)).toBe(avatarTint(42));
  });

  it("darkens each hue as its 500 at 20% over slate-950", () => {
    const base = ["#f43f5e", "#f97316", "#f59e0b", "#10b981", "#14b8a6", "#0ea5e9", "#6366f1", "#8b5cf6"];
    const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const night = rgb("#020617");
    AVATAR_TINTS.forEach((tint, i) => {
      const mixed = rgb(base[i]).map((c, k) => Math.round(0.2 * c + 0.8 * night[k]));
      expect(rgb(tint.dark.bg), tint.name).toEqual(mixed);
    });
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
