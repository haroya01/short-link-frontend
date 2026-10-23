import { describe, expect, it } from "vitest";
import { pullNotice } from "./home-pull";

const before = new Set(["note-1", "post-2", "pool-https://a.example/s/1"]);
const ok = { own: false, remote: false };

describe("what a 홈 pull says, from the rows laid out before and after", () => {
  it("a row that was not there before is new, and that stays quiet even when the request failed", () => {
    expect(pullNotice(before, ["note-9", "note-1"], ok)).toBe("newRows");
    expect(pullNotice(before, ["note-9"], { own: true, remote: false })).toBe("newRows");
  });

  it("the same rows, in any order or fewer of them, are nothing new", () => {
    expect(pullNotice(before, ["post-2", "note-1"], ok)).toBe("nothingNew");
    expect(pullNotice(before, ["note-1"], ok)).toBe("nothingNew");
  });

  it("nothing laid out after a good answer is caught up", () => {
    expect(pullNotice(before, [], ok)).toBe("caughtUp");
  });

  it("a failure with nothing new says it failed, rows or not", () => {
    expect(pullNotice(before, ["note-1"], { own: true, remote: false })).toBe("failed");
    expect(pullNotice(before, [], { own: true, remote: false })).toBe("failed");
  });
});
