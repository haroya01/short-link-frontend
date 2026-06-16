/**
 * Pure DOM painting for reader highlights over the static `.prose-post` body — shared by the live
 * {@link PostHighlights} component and its tests (no React / next-intl, so it's unit-testable in jsdom).
 *
 * `wrapAtOffsets` is the precise path: it paints the exact stored span (block index + char offsets),
 * which hits the right occurrence when a phrase repeats and spans inline formatting. `wrapFirstQuote`
 * is the fallback for when those offsets drift (the post was edited after the highlight was made).
 */
export const MARK_CLASS = "kurl-highlight";
export const MARK_STYLE = "background-color: rgba(5,150,105,0.18); border-radius: 2px;";
// A highlight that carries a memo gets a dashed underline + native tooltip so the margin note is
// discoverable without a heavier reveal UI.
export const NOTE_STYLE = MARK_STYLE + " border-bottom: 1.5px dashed rgba(5,150,105,0.65); cursor: help;";

/** Unwrap every highlight `<mark>` (so the set can be repainted from scratch). */
export function clearMarks(root: HTMLElement) {
  root.querySelectorAll(`mark.${MARK_CLASS}`).forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });
}

/**
 * Precise paint: wrap exactly the stored span — `root.children[blockOrder]`, character range
 * [startOffset, endOffset) over that block's concatenated text. Unlike the quote search this hits the
 * right occurrence when a phrase repeats, and it paints across inline formatting (bold/links/code) by
 * wrapping each text-node slice the range touches (one `<mark>` per slice). Returns false — so the
 * caller can fall back to the quote search — when the block is gone or the offsets no longer fit.
 */
export function wrapAtOffsets(
  root: HTMLElement,
  blockOrder: number,
  startOffset: number,
  endOffset: number,
  note: string | null,
): boolean {
  const block = root.children[blockOrder];
  if (!block || startOffset >= endOffset) return false;
  // Collect the slices first (don't mutate the tree while walking it).
  const slices: { node: Text; from: number; to: number }[] = [];
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement?.closest(`mark.${MARK_CLASS}`) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  let count = 0;
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    const len = n.data.length;
    const from = Math.max(startOffset, count) - count;
    const to = Math.min(endOffset, count + len) - count;
    if (from < to) slices.push({ node: n, from, to });
    count += len;
    if (count >= endOffset) break;
  }
  if (slices.length === 0) return false;
  for (const slice of slices) {
    const range = document.createRange();
    range.setStart(slice.node, slice.from);
    range.setEnd(slice.node, slice.to);
    const mark = document.createElement("mark");
    mark.className = MARK_CLASS;
    mark.setAttribute("style", note ? NOTE_STYLE : MARK_STYLE);
    if (note) mark.title = note;
    try {
      range.surroundContents(mark);
    } catch {
      /* a slice that somehow isn't a clean text range — skip it (the rest still paint) */
    }
  }
  return true;
}

/** Wrap the first occurrence of `quote` (within a single text node) in a highlight `<mark>`. A memo,
 *  if present, rides along as a dashed underline + native tooltip. Fallback for when precise offsets
 *  drift (post edited after the highlight). */
export function wrapFirstQuote(root: HTMLElement, quote: string, note: string | null) {
  if (!quote) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement?.closest(`mark.${MARK_CLASS}`) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  let n = walker.nextNode() as Text | null;
  while (n) {
    const idx = n.data.indexOf(quote);
    if (idx >= 0) {
      const range = document.createRange();
      range.setStart(n, idx);
      range.setEnd(n, idx + quote.length);
      const mark = document.createElement("mark");
      mark.className = MARK_CLASS;
      mark.setAttribute("style", note ? NOTE_STYLE : MARK_STYLE);
      if (note) mark.title = note;
      try {
        range.surroundContents(mark);
      } catch {
        /* range crosses element boundaries — skip painting this one */
      }
      return;
    }
    n = walker.nextNode() as Text | null;
  }
}
