import { describe, expect, it } from "vitest";
import { MIN_PUBLIC_VIEWS, showLikes, showViews } from "./public-metrics";

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
