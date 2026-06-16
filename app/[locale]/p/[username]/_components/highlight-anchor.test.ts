import { describe, it, expect } from "vitest";
import { wrapAtOffsets, wrapHighlight, clearMarks, MARK_CLASS, type HighlightMeta } from "./highlight-anchor";

function makeRoot(html: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "prose-post";
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

const meta = (id: number, note: string | null = null, replyCount = 0): HighlightMeta => ({
  id,
  note,
  replyCount,
});

const marks = (r: HTMLElement) => [...r.querySelectorAll<HTMLElement>(`mark.${MARK_CLASS}`)];

describe("wrapAtOffsets — precise highlight anchoring", () => {
  it("paints the RIGHT occurrence when a phrase repeats (offsets, not first text match)", () => {
    const r = makeRoot("<p>cats and dogs</p><p>I like cats here</p>");
    // "cats" in the SECOND block ("I like cats here") is at chars 7..11.
    expect(wrapAtOffsets(r, 1, 7, 11, meta(1))).toBe(true);
    const m = marks(r);
    expect(m).toHaveLength(1);
    expect(m[0].textContent).toBe("cats");
    expect(m[0].dataset.hlId).toBe("1");
    // first block's "cats" is left untouched — the naive first-match would have hit it.
    expect(r.children[0].querySelector("mark")).toBeNull();
    expect(r.children[1].querySelector("mark")?.textContent).toBe("cats");
  });

  it("paints across inline formatting (a span crossing a <strong>) as multiple slices", () => {
    const r = makeRoot("<p>Hello <strong>brave</strong> world</p>");
    // concatenated block text = "Hello brave world"; span 3..14 = "lo brave wo" (crosses into/out of <strong>).
    expect(wrapAtOffsets(r, 0, 3, 14, meta(2))).toBe(true);
    const m = marks(r);
    expect(m.length).toBeGreaterThan(1);
    expect(m.map((x) => x.textContent).join("")).toBe("lo brave wo");
    expect(r.querySelector("strong")?.textContent).toContain("brave");
  });

  it("returns false when the block index is gone (caller falls back to a quote search)", () => {
    const r = makeRoot("<p>only one block</p>");
    expect(wrapAtOffsets(r, 5, 0, 3, meta(3))).toBe(false);
    expect(marks(r)).toHaveLength(0);
  });

  it("a highlight with a thread gets the accent underline + note tooltip + its id", () => {
    const r = makeRoot("<p>note me please</p>");
    wrapAtOffsets(r, 0, 0, 4, meta(42, "my memo", 2));
    const m = r.querySelector<HTMLElement>("mark");
    expect(m?.dataset.hlId).toBe("42");
    expect(m?.getAttribute("title")).toBe("my memo");
    expect(m?.getAttribute("style")).toContain("solid"); // thread underline
  });

  it("a plain highlight (no note, no replies) is still clickable but without the underline", () => {
    const r = makeRoot("<p>plain span here</p>");
    wrapAtOffsets(r, 0, 0, 5, meta(7));
    const m = r.querySelector<HTMLElement>("mark");
    expect(m?.dataset.hlId).toBe("7");
    expect(m?.getAttribute("style")).toContain("cursor: pointer");
    expect(m?.getAttribute("style")).not.toContain("solid");
  });

  it("clearMarks fully unwraps so the body repaints clean", () => {
    const r = makeRoot("<p>abc</p>");
    wrapAtOffsets(r, 0, 0, 3, meta(5));
    expect(marks(r)).toHaveLength(1);
    clearMarks(r);
    expect(marks(r)).toHaveLength(0);
    expect(r.children[0].textContent).toBe("abc");
  });
});

describe("wrapHighlight — multi-block spans", () => {
  it("paints a span crossing blocks: start tail + whole middle + end head, one shared id", () => {
    const r = makeRoot("<p>alpha beta</p><p>gamma</p><p>delta epsilon</p>");
    // start block 0 @6 ("beta"…) → through block 1 whole ("gamma") → end block 2 @5 ("delta")
    wrapHighlight(
      r,
      { blockOrder: 0, endBlockOrder: 2, startOffset: 6, endOffset: 5, quote: "beta gamma delta" },
      meta(99),
    );
    expect(r.children[0].querySelector("mark")?.textContent).toBe("beta");
    expect(r.children[1].querySelector("mark")?.textContent).toBe("gamma");
    expect(r.children[2].querySelector("mark")?.textContent).toBe("delta");
    expect(marks(r).every((m) => m.dataset.hlId === "99")).toBe(true);
  });

  it("single-block (endBlockOrder == blockOrder) goes through the precise path", () => {
    const r = makeRoot("<p>just one block here</p>");
    wrapHighlight(r, { blockOrder: 0, endBlockOrder: 0, startOffset: 0, endOffset: 4, quote: "just" }, meta(1));
    expect(r.querySelector("mark")?.textContent).toBe("just");
  });
});
