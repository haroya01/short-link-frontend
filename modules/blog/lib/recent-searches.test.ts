import { beforeEach, describe, expect, it } from "vitest";
import { RECENT_SEARCHES_MAX, forgetSearch, readRecentSearches, rememberSearch } from "./recent-searches";

const KEY = "kurl:recent-searches:v1";

beforeEach(() => window.localStorage.clear());

describe("recent searches", () => {
  it("keeps the newest first and moves a repeated search back to the top", () => {
    rememberSearch("산책");
    rememberSearch("kurl");
    rememberSearch("  산책 ");
    expect(readRecentSearches()).toEqual(["산책", "kurl"]);
  });

  it("ignores a blank search", () => {
    rememberSearch("   ");
    expect(readRecentSearches()).toEqual([]);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it(`keeps at most ${RECENT_SEARCHES_MAX}`, () => {
    for (let i = 0; i < RECENT_SEARCHES_MAX + 3; i += 1) rememberSearch(`q${i}`);
    const list = readRecentSearches();
    expect(list).toHaveLength(RECENT_SEARCHES_MAX);
    expect(list[0]).toBe(`q${RECENT_SEARCHES_MAX + 2}`);
  });

  it("forgets one search and keeps the rest in order", () => {
    rememberSearch("산책");
    rememberSearch("kurl");
    rememberSearch("spring");
    expect(forgetSearch("kurl")).toEqual(["spring", "산책"]);
    expect(readRecentSearches()).toEqual(["spring", "산책"]);
  });

  it("reads anything else stored under the key as no history", () => {
    window.localStorage.setItem(KEY, "{broken");
    expect(readRecentSearches()).toEqual([]);
    window.localStorage.setItem(KEY, JSON.stringify([1, "a"]));
    expect(readRecentSearches()).toEqual([]);
  });
});
