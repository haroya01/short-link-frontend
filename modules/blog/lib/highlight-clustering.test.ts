import { describe, it, expect } from "vitest";
import {
  clusterByOverlap,
  selectPaintedHighlightIds,
  TOP_HIGHLIGHT_MIN_READERS,
  type PaintCandidate,
} from "./highlight-clustering";

/** Build a highlight. Defaults to a single-block span with no author, no thread. */
function hl(over: Partial<PaintCandidate> & Pick<PaintCandidate, "id">): PaintCandidate {
  return {
    author: null,
    blockOrder: 0,
    endBlockOrder: over.blockOrder ?? 0,
    startOffset: 0,
    endOffset: 10,
    note: null,
    replyCount: 0,
    ...over,
  };
}

const author = (id: number) => ({ id });
const idsOf = (clusters: PaintCandidate[][]) => clusters.map((c) => c.map((h) => h.id).sort((a, b) => a - b));

describe("clusterByOverlap — grouping overlapping passages", () => {
  it("puts two overlapping single-block spans in one cluster", () => {
    const clusters = clusterByOverlap([
      hl({ id: 1, startOffset: 0, endOffset: 10 }),
      hl({ id: 2, startOffset: 5, endOffset: 15 }),
    ]);
    expect(idsOf(clusters)).toEqual([[1, 2]]);
  });

  it("keeps non-overlapping spans in separate clusters", () => {
    const clusters = clusterByOverlap([
      hl({ id: 1, startOffset: 0, endOffset: 10 }),
      hl({ id: 2, startOffset: 20, endOffset: 30 }),
    ]);
    expect(idsOf(clusters)).toEqual([[1], [2]]);
  });

  it("treats touching spans (one ends where the next starts) as separate passages", () => {
    const clusters = clusterByOverlap([
      hl({ id: 1, startOffset: 0, endOffset: 10 }),
      hl({ id: 2, startOffset: 10, endOffset: 20 }),
    ]);
    expect(idsOf(clusters)).toEqual([[1], [2]]);
  });

  it("groups a transitive chain (A–B overlap, B–C overlap, A–C do not) into one cluster", () => {
    const clusters = clusterByOverlap([
      hl({ id: 1, startOffset: 0, endOffset: 10 }),
      hl({ id: 2, startOffset: 8, endOffset: 18 }),
      hl({ id: 3, startOffset: 16, endOffset: 26 }),
    ]);
    expect(idsOf(clusters)).toEqual([[1, 2, 3]]);
  });

  it("is order-independent (unsorted input clusters the same)", () => {
    const clusters = clusterByOverlap([
      hl({ id: 3, startOffset: 16, endOffset: 26 }),
      hl({ id: 1, startOffset: 0, endOffset: 10 }),
      hl({ id: 2, startOffset: 8, endOffset: 18 }),
    ]);
    expect(idsOf(clusters)).toEqual([[1, 2, 3]]);
  });

  it("does not merge same-offset spans that live in different blocks", () => {
    const clusters = clusterByOverlap([
      hl({ id: 1, blockOrder: 2, startOffset: 0, endOffset: 5 }),
      hl({ id: 2, blockOrder: 5, startOffset: 0, endOffset: 5 }),
    ]);
    expect(idsOf(clusters)).toEqual([[1], [2]]);
  });

  it("overlaps a multi-block span with a highlight inside one of its middle blocks", () => {
    const clusters = clusterByOverlap([
      hl({ id: 1, blockOrder: 2, endBlockOrder: 5, startOffset: 3, endOffset: 4 }),
      hl({ id: 2, blockOrder: 3, endBlockOrder: 3, startOffset: 1, endOffset: 2 }),
    ]);
    expect(idsOf(clusters)).toEqual([[1, 2]]);
  });
});

describe("selectPaintedHighlightIds — the paint rule", () => {
  it("always paints the viewer's own highlight, even alone and below threshold", () => {
    const painted = selectPaintedHighlightIds([hl({ id: 1, author: author(1) })], 1);
    expect([...painted]).toEqual([1]);
  });

  it("drops a single OTHER reader's bare highlight (not shared, no thread)", () => {
    const painted = selectPaintedHighlightIds([hl({ id: 1, author: author(2) })], 1);
    expect(painted.size).toBe(0);
  });

  it("paints an overlapping passage once two distinct OTHER readers share it (top highlight)", () => {
    const painted = selectPaintedHighlightIds(
      [
        hl({ id: 1, author: author(2), startOffset: 0, endOffset: 10 }),
        hl({ id: 2, author: author(3), startOffset: 4, endOffset: 14 }),
      ],
      1,
    );
    expect([...painted].sort()).toEqual([1, 2]);
  });

  it("does NOT count the same reader twice — two overlapping highlights by one other reader stay unpainted", () => {
    const painted = selectPaintedHighlightIds(
      [
        hl({ id: 1, author: author(2), startOffset: 0, endOffset: 10 }),
        hl({ id: 2, author: author(2), startOffset: 4, endOffset: 14 }),
      ],
      1,
    );
    expect(painted.size).toBe(0);
  });

  it("does NOT let the viewer's own overlap promote a single other reader to top", () => {
    // Passage shared by me (1) + one other (2). Mine paints on its own rule; the other stays dropped
    // because only ONE distinct *other* reader shares it.
    const painted = selectPaintedHighlightIds(
      [
        hl({ id: 1, author: author(1), startOffset: 0, endOffset: 10 }),
        hl({ id: 2, author: author(2), startOffset: 4, endOffset: 14 }),
      ],
      1,
    );
    expect([...painted]).toEqual([1]);
  });

  it("paints a below-threshold OTHER highlight that carries a note (a conversation)", () => {
    const painted = selectPaintedHighlightIds([hl({ id: 1, author: author(2), note: "worth a look" })], 1);
    expect([...painted]).toEqual([1]);
  });

  it("paints a below-threshold OTHER highlight that has replies", () => {
    const painted = selectPaintedHighlightIds([hl({ id: 1, author: author(2), replyCount: 3 })], 1);
    expect([...painted]).toEqual([1]);
  });

  it("treats a whitespace-only note as no thread (still dropped)", () => {
    const painted = selectPaintedHighlightIds([hl({ id: 1, author: author(2), note: "   " })], 1);
    expect(painted.size).toBe(0);
  });

  it("for a signed-out reader (meId null) counts every distinct author and owns nothing", () => {
    const painted = selectPaintedHighlightIds(
      [
        hl({ id: 1, author: author(2), startOffset: 0, endOffset: 10 }),
        hl({ id: 2, author: author(3), startOffset: 4, endOffset: 14 }),
        hl({ id: 3, author: author(4), startOffset: 40, endOffset: 50 }),
      ],
      null,
    );
    // 1+2 share a passage (2 distinct readers) → top; 3 is alone → dropped.
    expect([...painted].sort()).toEqual([1, 2]);
  });

  it("respects a raised threshold — 2 readers no longer qualify when 3 are required", () => {
    const two = [
      hl({ id: 1, author: author(2), startOffset: 0, endOffset: 10 }),
      hl({ id: 2, author: author(3), startOffset: 4, endOffset: 14 }),
    ];
    expect(selectPaintedHighlightIds(two, 1, 2).size).toBe(2);
    expect(selectPaintedHighlightIds(two, 1, 3).size).toBe(0);
  });

  it("counts an unattributed (null-author) highlight toward no reader, so it can't be top alone", () => {
    const painted = selectPaintedHighlightIds(
      [
        hl({ id: 1, author: null, startOffset: 0, endOffset: 10 }),
        hl({ id: 2, author: null, startOffset: 4, endOffset: 14 }),
      ],
      1,
    );
    expect(painted.size).toBe(0);
  });

  it("has a small-community default threshold of 2", () => {
    expect(TOP_HIGHLIGHT_MIN_READERS).toBe(2);
  });
});
