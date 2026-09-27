import { describe, it, expect } from "vitest";
import {
  wrapAtOffsets,
  wrapHighlight,
  wrapFirstQuote,
  clearMarks,
  MARK_CLASS,
  findQuoteTarget,
  highlightIdsForMark,
  readHighlightSelection,
  type HighlightMeta,
} from "./highlight-anchor";

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
    expect(m?.classList.contains("kurl-highlight--thread")).toBe(true); // thread underline
  });

  it("a plain highlight (no note, no replies) is still clickable but without the underline", () => {
    const r = makeRoot("<p>plain span here</p>");
    wrapAtOffsets(r, 0, 0, 5, meta(7));
    const m = r.querySelector<HTMLElement>("mark");
    expect(m?.dataset.hlId).toBe("7");
    expect(m?.classList.contains(MARK_CLASS)).toBe(true);
    expect(m?.classList.contains("kurl-highlight--thread")).toBe(false);
  });

  it("a painted mark is keyboard-reachable (focusable button)", () => {
    const r = makeRoot("<p>reach me by keyboard</p>");
    wrapAtOffsets(r, 0, 0, 5, meta(8));
    const m = r.querySelector<HTMLElement>("mark");
    expect(m?.getAttribute("role")).toBe("button");
    expect(m?.tabIndex).toBe(0);
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

describe("wrapFirstQuote — quote fallback across nodes", () => {
  it("paints a quote that crosses inline formatting (multiple text nodes)", () => {
    const r = makeRoot("<p>Hello <strong>brave</strong> world</p>");
    // "brave world" spans the <strong> text node and the trailing text node — a single-node indexOf misses it.
    wrapFirstQuote(r, "brave world", meta(1));
    const m = marks(r);
    expect(m.length).toBeGreaterThan(0);
    expect(m.map((x) => x.textContent).join("")).toBe("brave world");
    expect(r.querySelector("strong")?.textContent).toContain("brave");
  });

  it("still paints when the stored quote's whitespace differs from the rendered body", () => {
    const r = makeRoot("<p>the quick   brown fox</p>");
    // Stored quote has single spaces / a newline; body has a collapsed run — normalization bridges them.
    wrapFirstQuote(r, "quick brown\nfox", meta(2));
    expect(marks(r).map((x) => x.textContent).join("")).toBe("quick   brown fox");
  });

  it("paints the whole quote even when it starts/ends mid text node", () => {
    const r = makeRoot("<p>abcHELLOdef</p>");
    wrapFirstQuote(r, "HELLO", meta(3));
    expect(r.querySelector("mark")?.textContent).toBe("HELLO");
  });

  it("no-ops when the quote is absent (nothing painted)", () => {
    const r = makeRoot("<p>nothing to see</p>");
    wrapFirstQuote(r, "absent phrase", meta(4));
    expect(marks(r)).toHaveLength(0);
  });

  it("skips text already inside a highlight so a repaint can't double-wrap", () => {
    const r = makeRoot("<p>alpha beta</p>");
    wrapAtOffsets(r, 0, 0, 5, meta(1)); // "alpha" already marked
    wrapFirstQuote(r, "alpha", meta(2)); // must not re-wrap the already-painted "alpha"
    expect(marks(r)).toHaveLength(1);
    expect(marks(r)[0].dataset.hlId).toBe("1");
  });
});

// Regressions reproduced from real reader flows in the 2026-09-13 audit.
describe("stable coordinates and source recovery", () => {
  it("keeps later offsets when another passage in the same paragraph is already painted", () => {
    const r = makeRoot("<p>alpha beta gamma</p>");
    wrapHighlight(r, { blockOrder: 0, endBlockOrder: 0, startOffset: 0, endOffset: 5, quote: "alpha" }, meta(1));
    wrapHighlight(r, { blockOrder: 0, endBlockOrder: 0, startOffset: 6, endOffset: 10, quote: "beta" }, meta(2));
    expect(marks(r).map((m) => m.textContent)).toEqual(["alpha", "beta"]);
    expect(r.textContent).toBe("alpha beta gamma");
  });

  it("retains all overlapping conversation IDs on a single readable layer", () => {
    const r = makeRoot("<p>alpha beta gamma</p>");
    wrapHighlight(r, { blockOrder: 0, endBlockOrder: 0, startOffset: 0, endOffset: 10, quote: "alpha beta" }, meta(1, "first"));
    wrapHighlight(r, { blockOrder: 0, endBlockOrder: 0, startOffset: 6, endOffset: 16, quote: "beta gamma" }, meta(2, "second"));
    expect(r.querySelector("mark mark")).toBeNull();
    expect(marks(r).map((m) => [m.textContent, m.dataset.hlIds])).toEqual([
      ["alpha ", "1"], ["beta", "1,2"], [" gamma", "2"],
    ]);
    expect(r.textContent).toBe("alpha beta gamma");
    clearMarks(r);
    expect(r.innerHTML).toBe("<p>alpha beta gamma</p>");
  });

  it("recovers the saved quote after text is inserted before it", () => {
    const r = makeRoot("<p>Hello brave world</p>");
    wrapHighlight(r, { blockOrder: 0, endBlockOrder: 0, startOffset: 6, endOffset: 11, quote: "world" }, meta(1));
    expect(marks(r).map((m) => m.textContent)).toEqual(["world"]);
  });

  it("does not attribute a note to replacement text when the saved quote is gone", () => {
    const r = makeRoot("<p>Hello brave people</p>");
    wrapHighlight(r, { blockOrder: 0, endBlockOrder: 0, startOffset: 6, endOffset: 11, quote: "world" }, meta(1));
    expect(marks(r)).toHaveLength(0);
  });

  it("does not guess between repeated quotes after the saved coordinates drift", () => {
    const r = makeRoot("<p>Hello brave world and world</p>");
    wrapHighlight(r, { blockOrder: 0, endBlockOrder: 0, startOffset: 6, endOffset: 11, quote: "world" }, meta(1));
    expect(marks(r)).toHaveLength(0);
  });

  it("recovers across inserted blocks and does not partially paint an invalid span", () => {
    const r = makeRoot("<p>new introduction</p><p>alpha beta</p><p>gamma</p><p>delta epsilon</p>");
    wrapHighlight(r, { blockOrder: 0, endBlockOrder: 2, startOffset: 6, endOffset: 5, quote: "beta gamma delta" }, meta(1));
    expect(marks(r).map((m) => m.textContent)).toEqual(["beta", "gamma", "delta"]);
    expect(r.children[0].querySelector("mark")).toBeNull();
  });
});


describe("source navigation uses the same resolved anchors", () => {
  it("finds a quote split over multiple paragraphs, with and without painted marks", () => {
    const r = makeRoot("<p>alpha beta</p><p>gamma</p><p>delta epsilon</p>");
    const span = { blockOrder: 0, endBlockOrder: 2, startOffset: 6, endOffset: 5, quote: "beta gamma delta" };
    expect(findQuoteTarget(r, span.quote)).toBe(r.children[0]);
    wrapHighlight(r, span, meta(3));
    expect(findQuoteTarget(r, span.quote)?.textContent).toBe("beta");
    expect(highlightIdsForMark(findQuoteTarget(r, span.quote)!)).toEqual([3]);
  });

  it("uses the saved highlight identity to locate the right repeated phrase", () => {
    const r = makeRoot("<p>world</p><p>another world</p>");
    const span = { blockOrder: 1, endBlockOrder: 1, startOffset: 8, endOffset: 13, quote: "world" };
    expect(findQuoteTarget(r, "world")).toBeNull();
    expect(findQuoteTarget(r, "world", span)).toBe(r.children[1]);
  });

  it("finds a quote spanning inline formatting without depending on one whole mark", () => {
    const r = makeRoot("<p>Hello <strong>brave</strong> world</p>");
    const span = { blockOrder: 0, endBlockOrder: 0, startOffset: 6, endOffset: 17, quote: "brave world" };
    wrapHighlight(r, span, meta(4));
    expect(findQuoteTarget(r, span.quote)?.textContent).toBe("brave");
  });
});


describe("selection endpoints", () => {
  it("captures element boundaries across inline formatting in the original text coordinates", () => {
    const r = makeRoot("<p>Hello <strong>brave</strong> world</p>");
    const range = document.createRange();
    range.setStart(r.children[0], 1);
    range.setEnd(r.children[0], 3);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    expect(readHighlightSelection(r)).toMatchObject({ blockOrder: 0, endBlockOrder: 0, startOffset: 6, endOffset: 17, quote: "brave world" });
    selection.removeAllRanges();
  });

  it("captures root-level boundaries and refuses oversized selections before sending them", () => {
    const r = makeRoot("<p>alpha</p><p>beta</p>");
    const range = document.createRange();
    range.selectNodeContents(r);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    const captured = readHighlightSelection(r)!;
    expect(captured).toMatchObject({ blockOrder: 0, endBlockOrder: 1, startOffset: 0, endOffset: 4 });
    selection.removeAllRanges();
    wrapHighlight(r, captured, meta(9));
    expect(marks(r).map((mark) => mark.textContent)).toEqual(["alpha", "beta"]);
    const long = makeRoot("<p>" + "a".repeat(1001) + "</p>");
    range.selectNodeContents(long);
    selection.addRange(range);
    expect(readHighlightSelection(long)).toBeNull();
    selection.removeAllRanges();
  });
});
