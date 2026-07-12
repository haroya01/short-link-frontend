/**
 * Pure DOM painting for reader highlights over the static `.prose-post` body — shared by the live
 * {@link PostHighlights} component and its tests (no React / next-intl, so it's unit-testable in jsdom).
 *
 * `wrapAtOffsets` is the precise path: it paints the exact stored span (block index + char offsets),
 * which hits the right occurrence when a phrase repeats and spans inline formatting. `wrapFirstQuote`
 * is the fallback for when those offsets drift (the post was edited after the highlight was made) — it
 * matches the quote across text nodes / inline formatting and tolerates whitespace differences.
 *
 * Every `<mark>` carries `data-hl-id` so a click can open that highlight's reply thread; a highlight
 * that already has a note or replies gets an accent underline (invite to read), and its note rides
 * along as a tooltip.
 */
export const MARK_CLASS = "kurl-highlight";
// A highlight with a thread (an author note or at least one reply) gets an accent underline.
// The fill/underline/text colors — and their dark-mode variants — live in globals.css keyed off these
// classes (a `<mark>`'s UA default is a yellow fill + hardcoded dark text, both wrong here and
// unreadable in dark mode), so the painter only decides *which* classes a span carries.
const THREAD_CLASS = "kurl-highlight--thread";

/** What a painted mark needs to know: which highlight it is, and whether it carries a conversation. */
export type HighlightMeta = { id: number; note: string | null; replyCount: number };

function styleMark(mark: HTMLElement, meta: HighlightMeta) {
  const hasThread = !!meta.note || meta.replyCount > 0;
  mark.className = hasThread ? `${MARK_CLASS} ${THREAD_CLASS}` : MARK_CLASS;
  mark.dataset.hlId = String(meta.id);
  if (meta.note) mark.title = meta.note;
  // Keyboard-openable like the click target: a focusable button whose accessible name is the painted
  // quote (its own text). The reader can Tab to it and press Enter/Space to open the thread.
  mark.tabIndex = 0;
  mark.setAttribute("role", "button");
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

/** One text node's placement in a concatenated-text run: the node and where its text starts in that run. */
type TextPiece = { node: Text; start: number };

/** Every text node under `scope` not already inside a highlight, plus the concatenated text and each
 *  node's start offset within it — the basis for matching a quote that crosses nodes/inline formatting. */
function collectText(scope: Node): { full: string; pieces: TextPiece[] } {
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement?.closest(`mark.${MARK_CLASS}`) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  const pieces: TextPiece[] = [];
  let full = "";
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    pieces.push({ node: n, start: full.length });
    full += n.data;
  }
  return { full, pieces };
}

/** Collapse runs of whitespace to a single space, keeping a map from each normalized-string index back
 *  to its source index in `raw` — so a match found in the normalized text can be mapped to a raw range. */
function normalizeWithMap(raw: string): { norm: string; map: number[] } {
  let norm = "";
  const map: number[] = [];
  let prevSpace = false;
  for (let i = 0; i < raw.length; i++) {
    const isSpace = /\s/.test(raw[i]);
    if (isSpace) {
      if (prevSpace) continue; // collapse the run
      norm += " ";
      map.push(i);
      prevSpace = true;
    } else {
      norm += raw[i];
      map.push(i);
      prevSpace = false;
    }
  }
  return { norm, map };
}

/** Wrap the raw text range [rawStart, rawEnd) across `pieces` in one `<mark>` per intersected node — the
 *  same per-slice approach as {@link wrapAtOffsets}, so a range that crosses inline formatting still paints. */
function wrapRawRange(pieces: TextPiece[], rawStart: number, rawEnd: number, meta: HighlightMeta): boolean {
  const slices: { node: Text; from: number; to: number }[] = [];
  for (const p of pieces) {
    const len = p.node.data.length;
    const from = Math.max(rawStart, p.start) - p.start;
    const to = Math.min(rawEnd, p.start + len) - p.start;
    if (from < to) slices.push({ node: p.node, from, to });
  }
  if (slices.length === 0) return false;
  let painted = false;
  for (const slice of slices) {
    const range = document.createRange();
    range.setStart(slice.node, slice.from);
    range.setEnd(slice.node, slice.to);
    const mark = document.createElement("mark");
    styleMark(mark, meta);
    try {
      range.surroundContents(mark);
      painted = true;
    } catch {
      /* a slice that isn't a clean text range — skip it (the rest still paint) */
    }
  }
  return painted;
}

/** Wrap the first occurrence of `quote` in a highlight `<mark>`. Fallback for when precise offsets drift
 *  (post edited after the highlight). Matches across text nodes and inline formatting, and tolerates
 *  whitespace differences (collapsed runs / newlines) between the stored quote and the rendered body. */
export function wrapFirstQuote(root: HTMLElement, quote: string, meta: HighlightMeta) {
  if (!quote.trim()) return;
  const { full, pieces } = collectText(root);
  if (pieces.length === 0) return;
  const { norm, map } = normalizeWithMap(full);
  const needle = normalizeWithMap(quote).norm.trim();
  if (!needle) return;
  const at = norm.indexOf(needle);
  if (at < 0) return;
  // Map the normalized match back to raw offsets: first char's source index, last char's source index + 1.
  const rawStart = map[at];
  const rawEnd = map[at + needle.length - 1] + 1;
  wrapRawRange(pieces, rawStart, rawEnd, meta);
}

/** A highlight span — start in `blockOrder` at `startOffset`, end in `endBlockOrder` at `endOffset`
 *  (== blockOrder for a single-block highlight). */
export type HighlightSpan = {
  blockOrder: number;
  endBlockOrder: number;
  startOffset: number;
  endOffset: number;
  quote: string;
};

function blockTextLength(el: Element): number {
  return el.textContent?.length ?? 0;
}

/**
 * Paint a highlight that may cross blocks: the start block from `startOffset` to its end, every block
 * in between whole, and the end block up to `endOffset`. The single-block case (`endBlockOrder ==
 * blockOrder`) is the common path. Every slice carries the same `meta` (id/note/replyCount), so a tap
 * anywhere in the span opens the one thread. Falls back to a quote search if nothing landed (the body
 * was edited after the highlight was made).
 */
export function wrapHighlight(root: HTMLElement, span: HighlightSpan, meta: HighlightMeta) {
  const endBlock = span.endBlockOrder ?? span.blockOrder;
  if (endBlock <= span.blockOrder) {
    if (!wrapAtOffsets(root, span.blockOrder, span.startOffset, span.endOffset, meta)) {
      wrapFirstQuote(root, span.quote, meta);
    }
    return;
  }
  let painted = false;
  const first = root.children[span.blockOrder];
  if (first) {
    painted = wrapAtOffsets(root, span.blockOrder, span.startOffset, blockTextLength(first), meta) || painted;
  }
  for (let b = span.blockOrder + 1; b < endBlock; b++) {
    const mid = root.children[b];
    if (mid) painted = wrapAtOffsets(root, b, 0, blockTextLength(mid), meta) || painted;
  }
  const last = root.children[endBlock];
  if (last) painted = wrapAtOffsets(root, endBlock, 0, span.endOffset, meta) || painted;
  if (!painted) wrapFirstQuote(root, span.quote, meta);
}
