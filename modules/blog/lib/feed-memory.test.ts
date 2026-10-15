import { afterEach, describe, expect, it } from "vitest";
import {
  BLOG_MEMORY,
  NOTES_MEMORY,
  forgetFeedMemory,
  readFeedMemory,
  rememberedBlogTab,
  rememberedNotesFeed,
  writeFeedMemory,
} from "./feed-memory";

function clearCookies() {
  for (const c of document.cookie.split("; ")) {
    const name = c.split("=")[0];
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
}

afterEach(clearCookies);

describe("remembered switcher tab", () => {
  it("restores only the three blog switcher tabs and drops the retired series choice", () => {
    expect(rememberedBlogTab("following")).toBe("following");
    expect(rememberedBlogTab("recent")).toBe("recent");
    expect(rememberedBlogTab("trending")).toBe("trending");
    expect(rememberedBlogTab("series")).toBeNull();
    expect(rememberedBlogTab("for-you")).toBeNull();
    expect(rememberedBlogTab(undefined)).toBeNull();
  });

  it("restores only the three notes switcher feeds", () => {
    expect(rememberedNotesFeed("following")).toBe("following");
    expect(rememberedNotesFeed("everyone")).toBe("everyone");
    expect(rememberedNotesFeed("trending")).toBe("trending");
    expect(rememberedNotesFeed("bookmarks")).toBeNull();
    expect(rememberedNotesFeed("lists")).toBeNull();
  });

  it("writes a switcher tab to its own surface's cookie and nothing else", () => {
    writeFeedMemory(BLOG_MEMORY, "trending");
    writeFeedMemory(NOTES_MEMORY, "following");
    expect(document.cookie).toContain("kurl_blog_default_tab=trending");
    expect(document.cookie).toContain("kurl_notes_feed=following");
    expect(readFeedMemory(BLOG_MEMORY)).toBe("trending");
    expect(readFeedMemory(NOTES_MEMORY)).toBe("following");
  });

  it("never saves a 더 보기 source", () => {
    writeFeedMemory(BLOG_MEMORY, "recent");
    writeFeedMemory(BLOG_MEMORY, "for-you");
    writeFeedMemory(BLOG_MEMORY, "series");
    writeFeedMemory(NOTES_MEMORY, "bookmarks");
    expect(readFeedMemory(BLOG_MEMORY)).toBe("recent");
    expect(readFeedMemory(NOTES_MEMORY)).toBeNull();
  });

  it("reads an old saved series as nothing saved, and forgets on request", () => {
    document.cookie = "kurl_blog_default_tab=series; Path=/";
    expect(readFeedMemory(BLOG_MEMORY)).toBeNull();
    writeFeedMemory(BLOG_MEMORY, "following");
    forgetFeedMemory(BLOG_MEMORY);
    expect(readFeedMemory(BLOG_MEMORY)).toBeNull();
  });
});
