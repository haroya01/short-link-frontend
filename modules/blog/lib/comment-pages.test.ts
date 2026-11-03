import { describe, expect, it } from "vitest";
import type { CommentView } from "@/modules/blog/api/comments";
import { freshComments, newestCommentId } from "./comment-pages";

const c = (id: number, parentId: number | null = null, deleted = false) =>
  ({ id, parentId, author: deleted ? null : { id: 9, username: "u" }, body: deleted ? null : `${id}`, deleted }) as unknown as CommentView;

const ids = (list: CommentView[]) => list.map((x) => x.id);

describe("freshComments", () => {
  const current = [c(1), c(2, 1), c(3), c(5)];

  it("keeps only what is new, once, in id order", () => {
    expect(ids(freshComments(current, [c(3), c(8, 5), c(7), c(7), c(2, 1)], true))).toEqual([7, 8]);
  });

  it("drops a reply whose parent it does not have, and keeps one whose parent came along", () => {
    expect(ids(freshComments(current, [c(9, 4)], true))).toEqual([]);
    expect(ids(freshComments(current, [c(4, null, true), c(9, 4)], true))).toEqual([4, 9]);
  });

  it("leaves new top-level comments for the next page while the pages have not reached the end", () => {
    expect(ids(freshComments(current, [c(10), c(11, 10), c(12, 3)], false))).toEqual([12]);
    expect(ids(freshComments(current, [c(10), c(11, 10), c(12, 3)], true))).toEqual([10, 11, 12]);
  });
});

describe("newestCommentId", () => {
  it("is the largest id, or 0 for an empty list", () => {
    expect(newestCommentId(current())).toBe("5");
    expect(newestCommentId([])).toBe("0");
  });
});

function current() {
  return [c(1), c(5), c(2, 1)];
}
