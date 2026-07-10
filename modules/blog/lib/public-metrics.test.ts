import { describe, expect, it } from "vitest";
import { isRenderablePost, MIN_PUBLIC_VIEWS, showLikes, showViews } from "./public-metrics";

describe("public engagement metrics visibility", () => {
  it("hides view counts below the threshold so a new blog doesn't read as empty", () => {
    expect(showViews(0)).toBe(false);
    expect(showViews(1)).toBe(false);
    expect(showViews(MIN_PUBLIC_VIEWS - 1)).toBe(false);
  });

  it("shows view counts once a post has real traction", () => {
    expect(showViews(MIN_PUBLIC_VIEWS)).toBe(true);
    expect(showViews(MIN_PUBLIC_VIEWS + 100)).toBe(true);
  });

  it("hides a bare zero like count but shows it from the first like", () => {
    expect(showLikes(0)).toBe(false);
    expect(showLikes(1)).toBe(true);
    expect(showLikes(42)).toBe(true);
  });
});

describe("isRenderablePost", () => {
  it("renders a post with a real title", () => {
    expect(isRenderablePost({ title: "제목", excerpt: null })).toBe(true);
  });

  it("renders a title-less post that still has an excerpt", () => {
    expect(isRenderablePost({ title: "", excerpt: "요약은 있어요" })).toBe(true);
  });

  it("skips a post that is blank in both title and excerpt", () => {
    expect(isRenderablePost({ title: "", excerpt: null })).toBe(false);
    expect(isRenderablePost({ title: "   ", excerpt: "  " })).toBe(false);
    expect(isRenderablePost({})).toBe(false);
  });
});
