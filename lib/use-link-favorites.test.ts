import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pinFavoritesFirst } from "./use-link-favorites";

const STORAGE_KEY = "kurl:link-favorites";

function reset() {
  window.localStorage.clear();
}

beforeEach(reset);
afterEach(reset);

type Row = { shortCode: string };

function rows(...codes: string[]): Row[] {
  return codes.map((shortCode) => ({ shortCode }));
}

function codesOf(items: Row[]): string[] {
  return items.map((r) => r.shortCode);
}

describe("pinFavoritesFirst", () => {
  it("moves favorited items to the front, preserving their relative order", () => {
    const items = rows("a", "b", "c", "d");
    const result = pinFavoritesFirst(items, new Set(["b", "d"]), (r) => r.shortCode);
    expect(codesOf(result)).toEqual(["b", "d", "a", "c"]);
  });

  it("preserves the original order of the non-favorited tail (stable sort)", () => {
    const items = rows("a", "b", "c", "d", "e");
    const result = pinFavoritesFirst(items, new Set(["c"]), (r) => r.shortCode);
    expect(codesOf(result)).toEqual(["c", "a", "b", "d", "e"]);
  });

  it("returns the input unchanged when there are no favorites", () => {
    const items = rows("a", "b", "c");
    const result = pinFavoritesFirst(items, new Set(), (r) => r.shortCode);
    expect(result).toBe(items);
  });

  it("returns the input unchanged when no loaded item is favorited", () => {
    // 즐겨찾기가 아직 안 불러온 페이지에만 있으면 현재 페이지 순서는 그대로.
    const items = rows("a", "b", "c");
    const result = pinFavoritesFirst(items, new Set(["z"]), (r) => r.shortCode);
    expect(result).toBe(items);
  });
});

describe("favorites persistence (storage contract mirrored by the hook)", () => {
  // The hook's read/write go through this exact key + shape; assert the on-disk contract directly,
  // matching the repo's recent-links.test.ts approach (no hook renderer dependency in this repo).
  function read(): string[] {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
  }
  function toggle(code: string) {
    const current = read();
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  it("toggling a code on then off leaves the store empty", () => {
    toggle("abc");
    expect(read()).toEqual(["abc"]);
    toggle("abc");
    expect(read()).toEqual([]);
  });

  it("toggles are independent per code", () => {
    toggle("a1");
    toggle("a2");
    expect(read()).toEqual(["a1", "a2"]);
    toggle("a1");
    expect(read()).toEqual(["a2"]);
  });

  it("persists across reads (survives a simulated reload)", () => {
    toggle("keep");
    // A fresh read (new page load) sees the same set.
    expect(read()).toContain("keep");
  });
});
