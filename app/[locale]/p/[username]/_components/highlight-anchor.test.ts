import { describe, it, expect } from "vitest";
import { wrapAtOffsets, clearMarks, MARK_CLASS } from "./highlight-anchor";

function makeRoot(html: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "prose-post";
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

const marks = (r: HTMLElement) => [...r.querySelectorAll<HTMLElement>(`mark.${MARK_CLASS}`)];

describe("wrapAtOffsets — precise highlight anchoring", () => {
  it("paints the RIGHT occurrence when a phrase repeats (offsets, not first text match)", () => {
    const r = makeRoot("<p>cats and dogs</p><p>I like cats here</p>");
    // "cats" in the SECOND block ("I like cats here") is at chars 7..11.
    expect(wrapAtOffsets(r, 1, 7, 11, null)).toBe(true);
    const m = marks(r);
    expect(m).toHaveLength(1);
    expect(m[0].textContent).toBe("cats");
    // first block's "cats" is left untouched — the naive first-match would have hit it.
    expect(r.children[0].querySelector("mark")).toBeNull();
    expect(r.children[1].querySelector("mark")?.textContent).toBe("cats");
  });

  it("paints across inline formatting (a span crossing a <strong>) as multiple slices", () => {
    const r = makeRoot("<p>Hello <strong>brave</strong> world</p>");
    // concatenated block text = "Hello brave world"; span 3..14 = "lo brave wo" (crosses into/out of <strong>).
    expect(wrapAtOffsets(r, 0, 3, 14, null)).toBe(true);
    const m = marks(r);
    expect(m.length).toBeGreaterThan(1);
    expect(m.map((x) => x.textContent).join("")).toBe("lo brave wo");
    // the bold word stays bold — the mark is nested inside <strong>, not replacing it.
    expect(r.querySelector("strong")?.textContent).toContain("brave");
  });

  it("returns false when the block index is gone (caller falls back to a quote search)", () => {
    const r = makeRoot("<p>only one block</p>");
    expect(wrapAtOffsets(r, 5, 0, 3, null)).toBe(false);
    expect(marks(r)).toHaveLength(0);
  });

  it("carries a memo as a dashed underline + title", () => {
    const r = makeRoot("<p>note me please</p>");
    wrapAtOffsets(r, 0, 0, 4, "my memo");
    const m = r.querySelector<HTMLElement>("mark");
    expect(m?.getAttribute("title")).toBe("my memo");
    expect(m?.getAttribute("style")).toContain("dashed");
  });

  it("clearMarks fully unwraps so the body repaints clean", () => {
    const r = makeRoot("<p>abc</p>");
    wrapAtOffsets(r, 0, 0, 3, null);
    expect(marks(r)).toHaveLength(1);
    clearMarks(r);
    expect(marks(r)).toHaveLength(0);
    expect(r.children[0].textContent).toBe("abc");
  });
});
