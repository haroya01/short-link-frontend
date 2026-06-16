/**
 * Pure DOM painting for reader highlights over the static `.prose-post` body — shared by the live
 * {@link PostHighlights} component and its tests (no React / next-intl, so it's unit-testable in jsdom).
 *
 * `wrapAtOffsets` is the precise path: it paints the exact stored span (block index + char offsets),
 * which hits the right occurrence when a phrase repeats and spans inline formatting. `wrapFirstQuote`
 * is the fallback for when those offsets drift (the post was edited after the highlight was made).
 *
 * Every `<mark>` carries `data-hl-id` so a click can open that highlight's reply thread; a highlight
 * that already has a note or replies gets a solid accent underline (invite to read), and its note rides
 * along as a tooltip.
 */
export const MARK_CLASS = "kurl-highlight";
const BASE_STYLE = "background-color: rgba(5,150,105,0.18); border-radius: 2px; cursor: pointer;";
// A highlight with a thread (an author note or at least one reply) gets a solid accent underline.
const THREAD_STYLE = BASE_STYLE + " border-bottom: 1.5px solid rgba(5,150,105,0.6);";

/** What a painted mark needs to know: which highlight it is, and whether it carries a conversation. */
export type HighlightMeta = { id: number; note: string | null; replyCount: number };

function styleMark(mark: HTMLElement, meta: HighlightMeta) {
  mark.className = MARK_CLASS;
  mark.dataset.hlId = String(meta.id);
  const hasThread = !!meta.note || meta.replyCount > 0;
  mark.setAttribute("style", hasThread ? THREAD_STYLE : BASE_STYLE);
  if (meta.note) mark.title = meta.note;
}

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
  meta: HighlightMeta,
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
    styleMark(mark, meta);
    try {
      range.surroundContents(mark);
    } catch {
      /* a slice that somehow isn't a clean text range — skip it (the rest still paint) */
    }
  }
  return true;
}

/** Wrap the first occurrence of `quote` (within a single text node) in a highlight `<mark>`. Fallback
 *  for when precise offsets drift (post edited after the highlight). */
export function wrapFirstQuote(root: HTMLElement, quote: string, meta: HighlightMeta) {
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
      styleMark(mark, meta);
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
