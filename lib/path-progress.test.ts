import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  currentStepIndex,
  estimateMinutesForCount,
  estimatePathMinutes,
  isReadableStep,
  markStepOpened,
  nextReadableStep,
  readOpenedSteps,
  type PathStep,
} from "./path-progress";

function post(id: number): PathStep {
  return { id, blockType: "POST", slug: `s-${id}`, username: "writer" };
}
function highlight(id: number): PathStep {
  return { id, blockType: "HIGHLIGHT", slug: `s-${id}`, username: "writer" };
}
function note(id: number): PathStep {
  return { id, blockType: "NOTE", slug: null, username: null };
}

beforeEach(() => window.localStorage.clear());
afterEach(() => window.localStorage.clear());

describe("isReadableStep", () => {
  it("a post with slug + username is readable", () => {
    expect(isReadableStep(post(1))).toBe(true);
  });
  it("a highlight with slug + username is readable (deep-links to the sentence)", () => {
    expect(isReadableStep(highlight(1))).toBe(true);
  });
  it("a note has no destination", () => {
    expect(isReadableStep(note(1))).toBe(false);
  });
  it("a post missing its slug is not a destination", () => {
    expect(isReadableStep({ id: 1, blockType: "POST", slug: null, username: "w" })).toBe(false);
  });
});

describe("currentStepIndex", () => {
  const steps = [post(10), highlight(11), post(12)];

  it("is the first step when nothing has been opened", () => {
    expect(currentStepIndex(steps, new Set())).toBe(0);
  });
  it("advances past a contiguous run of opened steps", () => {
    expect(currentStepIndex(steps, new Set([10]))).toBe(1);
    expect(currentStepIndex(steps, new Set([10, 11]))).toBe(2);
  });
  it("returns the first UNOPENED step even when a later one was opened out of order", () => {
    // opened step 12 (the last) but not 11 → you are still 'at' index 1.
    expect(currentStepIndex(steps, new Set([10, 12]))).toBe(1);
  });
  it("returns a sentinel past the end when the whole path is read (complete)", () => {
    expect(currentStepIndex(steps, new Set([10, 11, 12]))).toBe(3);
  });
  it("is 0 for an empty path", () => {
    expect(currentStepIndex([], new Set())).toBe(0);
  });
});

describe("nextReadableStep", () => {
  it("returns the step at fromIndex when it is readable", () => {
    const steps = [post(1), post(2)];
    expect(nextReadableStep(steps, 1)).toEqual({ step: steps[1], index: 1 });
  });
  it("skips a note to the next readable step", () => {
    const steps = [post(1), note(2), post(3)];
    expect(nextReadableStep(steps, 1)).toEqual({ step: steps[2], index: 2 });
  });
  it("returns null when nothing readable remains (trailing note / past the end)", () => {
    expect(nextReadableStep([post(1), note(2)], 1)).toBeNull();
    expect(nextReadableStep([post(1)], 5)).toBeNull();
  });
  it("clamps a negative fromIndex to the start", () => {
    const steps = [post(1)];
    expect(nextReadableStep(steps, -3)).toEqual({ step: steps[0], index: 0 });
  });
});

describe("estimatePathMinutes", () => {
  it("counts only readable steps (notes don't add reading time)", () => {
    // 1 post + 1 highlight = 2 readable × 4 min; the note is excluded.
    expect(estimatePathMinutes([post(1), highlight(2), note(3)])).toBe(8);
  });
  it("never drops below 1 minute for a non-empty readable path", () => {
    expect(estimatePathMinutes([post(1)])).toBe(4);
  });
  it("is at least 1 even for a notes-only path", () => {
    expect(estimatePathMinutes([note(1), note(2)])).toBe(1);
  });
});

describe("estimateMinutesForCount", () => {
  it("uses the same per-step minutes as the resolved-step estimate", () => {
    // The discovery entrance rows carry a size but not resolved steps — the "약 N분" must still read
    // consistently with the collection detail (4 items × 4 min).
    expect(estimateMinutesForCount(4)).toBe(16);
  });
  it("never drops below 1 minute for an empty count", () => {
    expect(estimateMinutesForCount(0)).toBe(1);
  });
});

describe("read-set persistence", () => {
  it("markStepOpened is idempotent and round-trips through storage", () => {
    markStepOpened(7, 100);
    markStepOpened(7, 100);
    markStepOpened(7, 101);
    expect([...readOpenedSteps(7)].sort((a, b) => a - b)).toEqual([100, 101]);
  });
  it("scopes the opened set per collection id", () => {
    markStepOpened(1, 100);
    markStepOpened(2, 200);
    expect([...readOpenedSteps(1)]).toEqual([100]);
    expect([...readOpenedSteps(2)]).toEqual([200]);
  });
  it("returns an empty set for an untouched path", () => {
    expect(readOpenedSteps(999).size).toBe(0);
  });
});
