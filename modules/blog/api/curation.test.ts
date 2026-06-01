import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addBookmark,
  getBookmarks,
  isBookmarked,
  removeBookmark,
  type BookmarkItem,
} from "./curation";

const BOOKMARK_KEY = "kurl:curation:bookmarks";

function item(id: number): BookmarkItem {
  return { id, username: "kim", title: `post ${id}`, slug: `post-${id}` };
}

beforeEach(() => window.localStorage.clear());
afterEach(() => window.localStorage.clear());

describe("curation bookmarks (front-end mock)", () => {
  it("seeds the reading list on first getBookmarks() so the panel isn't empty", () => {
    expect(window.localStorage.getItem(BOOKMARK_KEY)).toBeNull();
    const seeded = getBookmarks();
    expect(seeded.length).toBeGreaterThan(0);
    expect(window.localStorage.getItem(BOOKMARK_KEY)).not.toBeNull();
  });

  it("addBookmark from a fresh store adds exactly that post — no seed mixed in", () => {
    const list = addBookmark(item(42));
    expect(list).toEqual([item(42)]);
    expect(isBookmarked(42)).toBe(true);
  });

  it("isBookmarked is false for unsaved posts and does not seed", () => {
    expect(isBookmarked(99)).toBe(false);
    expect(window.localStorage.getItem(BOOKMARK_KEY)).toBeNull();
  });

  it("addBookmark is idempotent and prepends newest first", () => {
    addBookmark(item(1));
    addBookmark(item(2));
    const again = addBookmark(item(1));
    expect(again.map((b) => b.id)).toEqual([2, 1]);
  });

  it("removeBookmark drops only the matching id", () => {
    addBookmark(item(1));
    addBookmark(item(2));
    const left = removeBookmark(1);
    expect(left.map((b) => b.id)).toEqual([2]);
    expect(isBookmarked(1)).toBe(false);
  });
});
